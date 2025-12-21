// frontend/app/api/stakes/pending/route.ts
// FIXED: Query blockchain as source of truth, database as backup

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';

// Create viem client for reading blockchain
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Helper function to get stake confirmation status from blockchain
async function getBlockchainConfirmationStatus(stakeId: string) {
  try {
    // Read the stake data from blockchain
    const stakeData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'stakes',
      args: [BigInt(stakeId)]
    }) as any;

    // The stake struct should have these fields (adjust based on your contract)
    return {
      user1Confirmed: stakeData.user1Confirmed || false,
      user2Confirmed: stakeData.user2Confirmed || false,
      user1ShowedUp: stakeData.user1ShowedUp || false,
      user2ShowedUp: stakeData.user2ShowedUp || false,
      processed: stakeData.processed || false,
      exists: true
    };
  } catch (error) {
    console.error(`Failed to read stake ${stakeId} from blockchain:`, error);
    return null;
  }
}

// Helper function to sync blockchain state to database
async function syncStakeToDatabase(stakeId: string, blockchainData: any) {
  try {
    const { error } = await supabaseService
      .from('stakes')
      .update({
        user1_confirmed: blockchainData.user1Confirmed,
        user2_confirmed: blockchainData.user2Confirmed,
        processed: blockchainData.processed,
        updated_at: new Date().toISOString()
      })
      .eq('id', stakeId);

    if (error) {
      console.error(`Failed to sync stake ${stakeId} to database:`, error);
    } else {
      console.log(`✅ Synced stake ${stakeId} from blockchain to database`);
    }
  } catch (error) {
    console.error(`Error syncing stake ${stakeId}:`, error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Address parameter is required'
      }, { status: 400 });
    }

    const address = userAddress.toLowerCase();
    const now = Math.floor(Date.now() / 1000);

    // Get all non-processed stakes involving this user from DATABASE
    const { data: stakes, error } = await supabaseService
      .from('stakes')
      .select('*')
      .or(`user1_address.eq.${address},user2_address.eq.${address}`)
      .eq('processed', false)
      .not('status', 'in', '(cancelled,expired)');

    if (error) {
      console.error('Error fetching stakes:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Separate into categories
    const waitingForAcceptance = [];
    const needingConfirmation = [];

    for (const stake of stakes || []) {
      const isUser1 = stake.user1_address === address;
      const matchAddress = isUser1 ? stake.user2_address : stake.user1_address;

      // Get match profile name
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('name')
        .eq('wallet_address', matchAddress)
        .single();

      const matchName = profile?.name || 'Your match';

      // CATEGORY 1: Waiting for acceptance
      if (stake.user1_staked && !stake.user2_staked) {
        const createdAt = new Date(stake.created_at).getTime() / 1000;
        const timeWaiting = now - createdAt;
        const timeUntilMeeting = stake.meeting_time - now;
        const hasMeetingPassed = stake.meeting_time < now;

        if (isUser1) {
          // User1 (creator) - can cancel before meeting or claim refund after
          waitingForAcceptance.push({
            stakeId: stake.id,
            matchAddress,
            matchName,
            meetingTime: stake.meeting_time,
            stakeAmount: stake.user1_amount.toString(),
            timeWaiting,
            timeUntilMeeting,
            hasMeetingPassed,
            canCancel: true,
            role: 'creator'
          });
        } else {
          // User2 (acceptor) - can only accept if meeting hasn't passed
          if (!hasMeetingPassed) {
            waitingForAcceptance.push({
              stakeId: stake.id,
              matchAddress,
              matchName,
              meetingTime: stake.meeting_time,
              stakeAmount: stake.user2_amount || stake.user1_amount,
              timeWaiting,
              timeUntilMeeting,
              hasMeetingPassed: false,
              canCancel: false,
              role: 'acceptor'
            });
          }
        }
      }

      // CATEGORY 2: Both staked, need to confirm date outcome
      // ✅ QUERY BLOCKCHAIN FIRST for confirmation status
      if (stake.user1_staked && stake.user2_staked) {
        const meetingPassed = stake.meeting_time < now;
        const windowOpen = now < stake.meeting_time + (48 * 60 * 60);

        if (meetingPassed && windowOpen) {
          // ✅ Query blockchain for the TRUE confirmation status
          console.log(`🔗 Querying blockchain for stake ${stake.id} confirmation status`);
          const blockchainData = await getBlockchainConfirmationStatus(stake.id);

          let user1Confirmed: boolean;
          let user2Confirmed: boolean;

          if (blockchainData && blockchainData.exists) {
            // ✅ USE BLOCKCHAIN DATA (source of truth)
            user1Confirmed = blockchainData.user1Confirmed;
            user2Confirmed = blockchainData.user2Confirmed;
            
            console.log(`✅ Blockchain data for stake ${stake.id}:`, {
              user1Confirmed,
              user2Confirmed,
              processed: blockchainData.processed
            });

            // ✅ Sync blockchain state to database in background (don't await)
            if (user1Confirmed !== stake.user1_confirmed || 
                user2Confirmed !== stake.user2_confirmed) {
              console.log(`🔄 Database out of sync, updating stake ${stake.id}`);
              syncStakeToDatabase(stake.id, blockchainData);
            }
          } else {
            // ❌ Blockchain query failed, fall back to database
            console.warn(`⚠️ Blockchain query failed for stake ${stake.id}, using database as fallback`);
            user1Confirmed = stake.user1_confirmed || false;
            user2Confirmed = stake.user2_confirmed || false;
          }

          const hasUserConfirmed = isUser1 ? user1Confirmed : user2Confirmed;
          const bothConfirmed = user1Confirmed && user2Confirmed;

          // Only show if:
          // 1. Meeting passed
          // 2. Window is still open  
          // 3. Current user hasn't confirmed (based on blockchain)
          // 4. Both users haven't confirmed yet (based on blockchain)
          if (!hasUserConfirmed && !bothConfirmed) {
            const deadline = stake.meeting_time + (48 * 60 * 60);
            const timeRemaining = deadline - now;

            needingConfirmation.push({
              stakeId: stake.id,
              matchAddress,
              matchName,
              meetingTime: stake.meeting_time,
              stakeAmount: (isUser1 ? stake.user1_amount : stake.user2_amount).toString(),
              deadline,
              timeRemaining
            });
          } else {
            console.log(`✅ Stake ${stake.id}: User confirmed (${hasUserConfirmed}) or both confirmed (${bothConfirmed}), hiding from banner`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      waitingForAcceptance,
      needingConfirmation
    });

  } catch (error) {
    console.error('Error in pending stakes API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending stakes'
    }, { status: 500 });
  }
}
