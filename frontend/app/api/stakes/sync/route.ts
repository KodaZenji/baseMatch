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
      fromBlock: FIRST_STAKE_BLOCK,
      toBlock: 'latest'
    });

    console.log(`📊 Found ${logs.length} stake events total`);

    // Group by unique stakeId
    const stakeMap = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      if (log.args.stakeId) {
        const id = log.args.stakeId.toString();
        // Keep the first occurrence (has the meeting details)
        if (!stakeMap.has(id)) {
          stakeMap.set(id, log);
        }
      }
    }

    console.log(`🎯 Processing ${stakeMap.size} unique stakes`);

    let synced = 0;
    let updated = 0;
    let errors = 0;

    for (const [stakeId, log] of stakeMap) {
      try {
        const { user1, user2, amount, meetingTime } = log.args;

        if (!user1 || !user2 || !amount || !meetingTime) {
          console.warn(`⚠️ Skipping stake ${stakeId} - missing data`);
          errors++;
          continue;
        }

        // ALWAYS fetch fresh state from contract
        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [BigInt(stakeId)]
        }) as any;

        console.log(`📊 Stake ${stakeId} state:`, {
          user1Staked: stakeData.user1Staked,
          user2Staked: stakeData.user2Staked,
          processed: stakeData.processed
        });

        // Calculate amounts
        const user1Amount = Number(amount) / 1_000_000;
        const user2Amount = stakeData.user2Staked ? Number(amount) / 1_000_000 : 0;
        const totalStaked = user1Amount + user2Amount;

        // Determine status
        let status = 'pending';
        if (stakeData.processed) {
          status = 'completed';
        } else if (stakeData.user1Staked && stakeData.user2Staked) {
          status = 'active';
        }

        const stakeRecord = {
          id: stakeId,
          user1_address: user1.toLowerCase(),
          user2_address: user2.toLowerCase(),
          user1_amount: user1Amount,
          user2_amount: user2Amount,
          total_staked: totalStaked,
          meeting_time: Number(meetingTime),
          user1_staked: stakeData.user1Staked,
          user2_staked: stakeData.user2Staked,
          user1_confirmed: stakeData.user1Confirmed || false,
          user2_confirmed: stakeData.user2Confirmed || false,
          processed: stakeData.processed || false,
          status: status
        };

        // Check if exists
        const { data: existing } = await supabaseService
          .from('stakes')
          .select('id')
          .eq('id', stakeId)
          .single();

        if (existing) {
          // UPDATE existing stake with fresh contract state
          const { error: updateError } = await supabaseService
            .from('stakes')
            .update(stakeRecord)
            .eq('id', stakeId);

          if (updateError) {
            console.error(`❌ Failed to update stake ${stakeId}:`, updateError);
            errors++;
          } else {
            console.log(`🔄 Updated stake ${stakeId}`);
            updated++;
          }
        } else {
          // INSERT new stake
          const { error: insertError } = await supabaseService
            .from('stakes')
            .insert(stakeRecord);

          if (insertError) {
            console.error(`❌ Failed to insert stake ${stakeId}:`, insertError);
            errors++;
          } else {
            console.log(`✅ Synced stake ${stakeId}`);
            synced++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing stake ${stakeId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${synced} new, ${updated} updated, ${errors} errors`,
      synced,
      updated,
      errors,
      totalEvents: logs.length,
      uniqueStakes: stakeMap.size
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
      fromBlock: FIRST_STAKE_BLOCK,
      toBlock: 'latest'
    });

    // Filter for stakes involving this user
    const userLogs = logs.filter(log => 
      log.args.user1?.toLowerCase() === userAddress.toLowerCase() ||
      log.args.user2?.toLowerCase() === userAddress.toLowerCase()
    );

    console.log(`📊 Found ${userLogs.length} stake events for user`);

    // Group by unique stakeId
    const stakeMap = new Map<string, typeof logs[0]>();
    for (const log of userLogs) {
      if (log.args.stakeId) {
        const id = log.args.stakeId.toString();
        if (!stakeMap.has(id)) {
          stakeMap.set(id, log);
        }
      }
    }

    let synced = 0;
    let updated = 0;
    let errors = 0;

    for (const [stakeId, log] of stakeMap) {
      try {
        const { user1, user2, amount, meetingTime } = log.args;

        if (!user1 || !user2 || !amount || !meetingTime) {
          errors++;
          continue;
        }

        // Get fresh stake state
        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [BigInt(stakeId)]
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

        const stakeRecord = {
          id: stakeId,
          user1_address: user1.toLowerCase(),
          user2_address: user2.toLowerCase(),
          user1_amount: user1Amount,
          user2_amount: user2Amount,
          total_staked: totalStaked,
          meeting_time: Number(meetingTime),
          user1_staked: stakeData.user1Staked,
          user2_staked: stakeData.user2Staked,
          user1_confirmed: stakeData.user1Confirmed || false,
          user2_confirmed: stakeData.user2Confirmed || false,
          processed: stakeData.processed || false,
          status: status
        };

        const { data: existing } = await supabaseService
          .from('stakes')
          .select('id')
          .eq('id', stakeId)
          .single();

        if (existing) {
          const { error: updateError } = await supabaseService
            .from('stakes')
            .update(stakeRecord)
            .eq('id', stakeId);
          
          if (!updateError) {
            updated++;
          } else {
            errors++;
          }
        } else {
          const { error: insertError } = await supabaseService
            .from('stakes')
            .insert(stakeRecord);

          if (!insertError) {
            synced++;
          } else {
            errors++;
          }
        }

      } catch (error) {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} new, ${updated} updated, ${errors} errors`,
      synced,
      updated,
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
