import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import { supabaseService } from '@/lib/supabase.server';
import { CONTRACTS, STAKING_ABI } from '@/lib/contracts';

const FIRST_STAKE_BLOCK = 35208690n;
const MAX_BLOCK_RANGE = 100000n; // Base Sepolia limit

// Helper function to fetch logs in chunks to avoid block range limits
async function fetchLogsInChunks(address: `0x${string}`, fromBlock: bigint, toBlock: bigint) {
  console.log(`🔍 Fetching logs from block ${fromBlock} to ${toBlock}`);

  const logs = [];
  let currentFromBlock = fromBlock;

  while (currentFromBlock <= toBlock) {
    const currentToBlock = currentFromBlock + MAX_BLOCK_RANGE < toBlock
      ? currentFromBlock + MAX_BLOCK_RANGE
      : toBlock;

    console.log(`📡 Fetching chunk: ${currentFromBlock} to ${currentToBlock}`);

    try {
      const chunkLogs = await publicClient.getLogs({
        address: address,
        event: parseAbiItem('event StakeCreated(uint256 indexed stakeId, address indexed user1, address indexed user2, uint256 amount, uint256 meetingTime)'),
        fromBlock: currentFromBlock,
        toBlock: currentToBlock
      });

      logs.push(...chunkLogs);
      console.log(`✅ Got ${chunkLogs.length} logs from chunk`);
    } catch (error) {
      console.error(`❌ Error fetching logs for block range ${currentFromBlock}-${currentToBlock}:`, error);
      throw error;
    }

    currentFromBlock = currentToBlock + 1n;
  }

  return logs;
}
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// GET endpoint - Sync ALL stakes from blockchain (for backfilling)
export async function GET() {
  try {
    console.log('🔍 Syncing all stakes from blockchain...');

    // Get current block number
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`📊 Current block: ${currentBlock}`);

    // Get all StakeCreated events from the contract in chunks
    const logs = await fetchLogsInChunks(
      CONTRACTS.STAKING as `0x${string}`,
      FIRST_STAKE_BLOCK,
      currentBlock
    );

    console.log(`📊 Found ${logs.length} stake events total`);

    // Group by unique stakeId
    const stakeMap = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      if (log.args.stakeId) {
        const id = log.args.stakeId.toString();
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

        console.log(`📡 Fetching stake ${stakeId} from contract...`);

        // ALWAYS fetch fresh state from contract
        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [BigInt(stakeId)]
        }) as any;

        console.log(`📊 Stake ${stakeId} contract data:`, {
          user1: stakeData.user1,
          user2: stakeData.user2,
          user1Amount: stakeData.user1Amount?.toString(),
          user2Amount: stakeData.user2Amount?.toString(),
          user1Staked: stakeData.user1Staked,
          user2Staked: stakeData.user2Staked,
          processed: stakeData.processed
        });

        // ✅ Get confirmations separately with ALL fields
        const user1Confirmation = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stakeId), user1]
        }) as any;

        const user2Confirmation = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stakeId), user2]
        }) as any;

        // Calculate amounts (convert from contract units)
        const user1Amount = Number(stakeData.user1Amount) / 1_000_000;
        const user2Amount = Number(stakeData.user2Amount) / 1_000_000;
        const totalStaked = Number(stakeData.totalStaked) / 1_000_000;

        // Determine status
        let status = 'pending';
        if (stakeData.processed) {
          status = 'completed';
        } else if (stakeData.user1Staked && stakeData.user2Staked) {
          status = 'active';
        }

        console.log(`📌 Status: ${status}, user1Staked: ${stakeData.user1Staked}, user2Staked: ${stakeData.user2Staked}`);
        console.log(`✅ User1 confirmation:`, {
          hasConfirmed: user1Confirmation.hasConfirmed,
          iShowedUp: user1Confirmation.iShowedUp,
          theyShowedUp: user1Confirmation.theyShowedUp
        });
        console.log(`✅ User2 confirmation:`, {
          hasConfirmed: user2Confirmation.hasConfirmed,
          iShowedUp: user2Confirmation.iShowedUp,
          theyShowedUp: user2Confirmation.theyShowedUp
        });

        // ✅ FIXED: Include ALL 6 confirmation fields
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
          user1_confirmed: user1Confirmation.hasConfirmed || false,
          user1_i_showed_up: user1Confirmation.iShowedUp || false,
          user1_they_showed_up: user1Confirmation.theyShowedUp || false,
          user2_confirmed: user2Confirmation.hasConfirmed || false,
          user2_i_showed_up: user2Confirmation.iShowedUp || false,
          user2_they_showed_up: user2Confirmation.theyShowedUp || false,
          processed: stakeData.processed || false,
          status: status
        };

        console.log(`💾 Record to save:`, stakeRecord);

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
            console.log(`✅ Updated stake ${stakeId}`);
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

    // Get current block number
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`📊 Current block: ${currentBlock}`);

    // Get all StakeCreated events from the contract in chunks
    const logs = await fetchLogsInChunks(
      CONTRACTS.STAKING as `0x${string}`,
      FIRST_STAKE_BLOCK,
      currentBlock
    );

    const userLogs = logs.filter(log =>
      log.args.user1?.toLowerCase() === userAddress.toLowerCase() ||
      log.args.user2?.toLowerCase() === userAddress.toLowerCase()
    );

    console.log(`📊 Found ${userLogs.length} stake events for user`);

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

        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [BigInt(stakeId)]
        }) as any;

        // ✅ Get confirmations with ALL fields
        const user1Confirmation = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stakeId), user1]
        }) as any;

        const user2Confirmation = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stakeId), user2]
        }) as any;

        const user1Amount = Number(stakeData.user1Amount) / 1_000_000;
        const user2Amount = Number(stakeData.user2Amount) / 1_000_000;
        const totalStaked = Number(stakeData.totalStaked) / 1_000_000;

        let status = 'pending';
        if (stakeData.processed) {
          status = 'completed';
        } else if (stakeData.user1Staked && stakeData.user2Staked) {
          status = 'active';
        }

        // ✅ FIXED: Include ALL 6 confirmation fields
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
          user1_confirmed: user1Confirmation.hasConfirmed || false,
          user1_i_showed_up: user1Confirmation.iShowedUp || false,
          user1_they_showed_up: user1Confirmation.theyShowedUp || false,
          user2_confirmed: user2Confirmation.hasConfirmed || false,
          user2_i_showed_up: user2Confirmation.iShowedUp || false,
          user2_they_showed_up: user2Confirmation.theyShowedUp || false,
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
