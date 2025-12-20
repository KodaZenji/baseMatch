import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { supabaseService } from '@/lib/supabase.server';
import { CONTRACTS, STAKING_ABI } from '@/lib/contracts';

const FIRST_STAKE_BLOCK = 35208690n;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// GET endpoint - Sync ALL stakes from blockchain (for backfilling)
export async function GET() {
  try {
    console.log('🔍 Syncing all stakes from blockchain...');

    // Get all StakeCreated events from the contract
    const logs = await publicClient.getLogs({
      address: CONTRACTS.STAKING as `0x${string}`,
      event: parseAbiItem('event StakeCreated(uint256 indexed stakeId, address indexed user1, address indexed user2, uint256 amount, uint256 meetingTime)'),
      fromBlock: FIRST_STAKE_BLOCK, // Changed from 0n
      toBlock: 'latest'
    });

    console.log(`📊 Found ${logs.length} stake events total`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const log of logs) {
      try {
        const { stakeId, user1, user2, amount, meetingTime } = log.args;

        if (!stakeId || !user1 || !user2 || !amount || !meetingTime) {
          console.warn('⚠️ Skipping invalid log entry');
          errors++;
          continue;
        }

        // Check if already exists in database
        const { data: existing } = await supabaseService
          .from('stakes')
          .select('id')
          .eq('id', stakeId.toString())
          .single();

        if (existing) {
          console.log(`⏭️  Stake ${stakeId} already exists, skipping`);
          skipped++;
          continue;
        }

        // Get current stake state from contract
        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [stakeId]
        }) as any;

        // Calculate total staked
        const user1Amount = Number(amount) / 1_000_000; // Convert from 6 decimals
        const user2Amount = stakeData.user2Staked ? Number(amount) / 1_000_000 : 0;
        const totalStaked = user1Amount + user2Amount;

        // Determine status
        let status = 'pending';
        if (stakeData.processed) {
          status = 'completed';
        } else if (stakeData.user1Staked && stakeData.user2Staked) {
          status = 'active';
        }

        // Insert into database
        const { error: insertError } = await supabaseService
          .from('stakes')
          .insert({
            id: stakeId.toString(),
            user1_address: user1.toLowerCase(),
            user2_address: user2.toLowerCase(),
            user1_amount: user1Amount,
            user2_amount: user2Amount,
            total_staked: totalStaked,
            meeting_time: Number(meetingTime),
            user1_staked: true,
            user2_staked: stakeData.user2Staked || false,
            user1_confirmed: false,
            user2_confirmed: false,
            processed: stakeData.processed || false,
            status: status
          });

        if (insertError) {
          console.error(`❌ Failed to insert stake ${stakeId}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Synced stake ${stakeId}`);
          synced++;
        }

      } catch (error) {
        console.error('❌ Error processing log:', error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`,
      synced,
      skipped,
      errors,
      total: logs.length
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync stakes'
    }, { status: 500 });
  }
}

// POST endpoint - Sync stakes for a specific user
export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'userAddress is required'
      }, { status: 400 });
    }

    console.log('🔍 Syncing stakes for user:', userAddress);

    // Get StakeCreated events involving this user
    const logs = await publicClient.getLogs({
      address: CONTRACTS.STAKING as `0x${string}`,
      event: parseAbiItem('event StakeCreated(uint256 indexed stakeId, address indexed user1, address indexed user2, uint256 amount, uint256 meetingTime)'),
      fromBlock: FIRST_STAKE_BLOCK, // Changed from 0n
      toBlock: 'latest'
    });

    // Filter for stakes involving this user (as user1 or user2)
    const userLogs = logs.filter(log => 
      log.args.user1?.toLowerCase() === userAddress.toLowerCase() ||
      log.args.user2?.toLowerCase() === userAddress.toLowerCase()
    );

    console.log(`📊 Found ${userLogs.length} stakes for this user`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const log of userLogs) {
      try {
        const { stakeId, user1, user2, amount, meetingTime } = log.args;

        if (!stakeId || !user1 || !user2 || !amount || !meetingTime) {
          errors++;
          continue;
        }

        // Check if already exists
        const { data: existing } = await supabaseService
          .from('stakes')
          .select('id')
          .eq('id', stakeId.toString())
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Get stake state
        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [stakeId]
        }) as any;

        const user1Amount = Number(amount) / 1_000_000;
        const user2Amount = stakeData.user2Staked ? Number(amount) / 1_000_000 : 0;
        const totalStaked = user1Amount + user2Amount;

        let status = 'pending';
        if (stakeData.processed) {
          status = 'completed';
        } else if (stakeData.user1Staked && stakeData.user2Staked) {
          status = 'active';
        }

        const { error: insertError } = await supabaseService
          .from('stakes')
          .insert({
            id: stakeId.toString(),
            user1_address: user1.toLowerCase(),
            user2_address: user2.toLowerCase(),
            user1_amount: user1Amount,
            user2_amount: user2Amount,
            total_staked: totalStaked,
            meeting_time: Number(meetingTime),
            user1_staked: true,
            user2_staked: stakeData.user2Staked || false,
            user1_confirmed: false,
            user2_confirmed: false,
            processed: stakeData.processed || false,
            status: status
          });

        if (!insertError) {
          synced++;
        } else {
          errors++;
        }

      } catch (error) {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} stakes for user, skipped ${skipped}, ${errors} errors`,
      synced,
      skipped,
      errors
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync stakes'
    }, { status: 500 });
  }
}
