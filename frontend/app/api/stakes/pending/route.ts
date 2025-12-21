// frontend/app/api/stakes/pending/route.ts
// FIXED: Query blockchain using getStake and getConfirmation functions

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

// Helper function to get confirmation status from blockchain for a specific user
async function getBlockchainConfirmationStatus(stakeId: string, userAddress: string) {
  try {
    console.log(`🔗 Querying blockchain confirmation for stake ${stakeId}, user ${userAddress}`);
    
    // Read confirmation data from blockchain using getConfirmation function
    const confirmationData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'getConfirmation',
      args: [BigInt(stakeId), userAddress as `0x${string}`]
    }) as any;

    // Parse the tuple response: (hasConfirmed, iShowedUp, theyShowedUp)
    return {
      hasConfirmed: confirmationData[0] || false,
      iShowedUp: confirmationData[1] || false,
      theyShowedUp: confirmationData[2] || false,
      exists: true
    };
  } catch (error) {
    console.error(`Failed to read confirmation for stake ${stakeId}:`, error);
    return null;
  }
}

// Helper function to get stake data from blockchain
async function getStakeFromBlockchain(stakeId: string) {
  try {
    console.log(`🔗 Querying blockchain for stake ${stakeId} data`);
    
    const stakeData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'getStake',
      args: [BigInt(stakeId)]
    }) as any;

    // Parse the stake tuple
    return {
      user1: stakeData[0],
      user2: stakeData[1],
      user1Amount: stakeData[2],
      user2Amount: stakeData[3],
      totalStaked: stakeData[4],
      meetingTime: stakeData[5],
      user1Staked: stakeData[6],
      user2Staked: stakeData[7],
      processed: stakeData[8],
      createdAt: stakeData[9],
      exists: true
    };
  } catch (error) {
    console.error(`Failed to read stake ${stakeId}:`, error);
    return null;
  }
}

// Helper function to sync blockchain state to database
async function syncConfirmationToDatabase(
  stakeId: string,
  user1Address: string,
  user2Address: string,
  user1Confirmed: boolean,
  user2Confirmed: boolean
) {
  try {
    const { error } = await supabaseService
      .from('stakes')
      .update({
        user1_confirmed: user1Confirmed,
        user2_confirmed: user2Confirmed,
        updated_at: new Date().toISOString()
      })
      .eq('id', stakeId);

    if (error) {
      console.error(`Failed to sync stake ${stakeId} to database:`, error);
    } else {
      console.log(`✅ Synced stake ${stakeId} confirmations to database`);
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
      // ✅ QUERY BLOCKCHAIN for confirmation status
      if (stake.user1_staked && stake.user2_staked) {
        const meetingPassed = stake.meeting_time < now;
        const windowOpen = now < stake.meeting_time + (48 * 60 * 60);

        if (meetingPassed && windowOpen) {
          // ✅ Query blockchain for both users' confirmation status
          console.log(`🔗 Querying blockchain for stake ${stake.id} confirmation status`);
          
          const [user1ConfirmationData, user2ConfirmationData] = await Promise.all([
            getBlockchainConfirmationStatus(stake.id, stake.user1_address),
            getBlockchainConfirmationStatus(stake.id, stake.user2_address)
          ]);

          let user1Confirmed: boolean;
          let user2Confirmed: boolean;

          if (user1ConfirmationData && user2ConfirmationData) {
            // ✅ USE BLOCKCHAIN DATA (source of truth)
            user1Confirmed = user1ConfirmationData.hasConfirmed;
            user2Confirmed = user2ConfirmationData.hasConfirmed;
            
            console.log(`✅ Blockchain confirmation data for stake ${stake.id}:`, {
              user1Confirmed,
              user2Confirmed
            });

            // ✅ Sync blockchain state to database in background (don't await)
            if (user1Confirmed !== stake.user1_confirmed || 
                user2Confirmed !== stake.user2_confirmed) {
              console.log(`🔄 Database out of sync, updating stake ${stake.id}`);
              syncConfirmationToDatabase(
                stake.id,
                stake.user1_address,
                stake.user2_address,
                user1Confirmed,
                user2Confirmed
              );
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
          // 1. Current user hasn't confirmed (based on blockchain)
          // 2. Both users haven't confirmed yet (based on blockchain)
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
