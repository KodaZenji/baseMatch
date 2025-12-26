import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { supabaseService } from '@/lib/supabase.server';
import { CONTRACTS, STAKING_ABI } from '@/lib/contracts';

/**
 * CONFIG
 */
const CONTRACT_CREATION_BLOCK = 39953089n;
const MAX_BLOCK_RANGE = 100_000n;

/**
 * Base Mainnet client (Alchemy)
 */
const publicClient = createPublicClient({
  chain: base,
  transport: http(
    `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  )
});

/**
 * Cursor helpers (NO CRON — manual/on-demand only)
 */
async function getFromBlock(): Promise<bigint> {
  const { data } = await supabaseService
    .from('stake_sync_cursor')
    .select('last_block')
    .eq('id', 'staking')
    .single();

  if (!data?.last_block) {
    return CONTRACT_CREATION_BLOCK;
  }

  return BigInt(data.last_block);
}

async function updateLastBlock(block: bigint) {
  await supabaseService
    .from('stake_sync_cursor')
    .upsert({
      id: 'staking',
      last_block: Number(block),
      updated_at: new Date().toISOString()
    });
}

/**
 * Chunked log fetcher (Base RPC-safe)
 */
async function fetchLogsInChunks(
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
) {
  const logs = [];
  let current = fromBlock;

  while (current <= toBlock) {
    const end =
      current + MAX_BLOCK_RANGE > toBlock
        ? toBlock
        : current + MAX_BLOCK_RANGE;

    const chunk = await publicClient.getLogs({
      address,
      event: parseAbiItem(
        'event StakeCreated(uint256 indexed stakeId, address indexed user1, address indexed user2, uint256 amount, uint256 meetingTime)'
      ),
      fromBlock: current,
      toBlock: end
    });

    logs.push(...chunk);
    current = end + 1n;
  }

  return logs;
}

/**
 * GET — Sync ALL stakes (manual trigger only)
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = await getFromBlock();

    if (fromBlock > currentBlock) {
      return NextResponse.json({
        success: true,
        message: 'Already synced'
      });
    }

    console.log(`🔄 Syncing from ${fromBlock} → ${currentBlock}`);

    const logs = await fetchLogsInChunks(
      CONTRACTS.STAKING as `0x${string}`,
      fromBlock,
      currentBlock
    );

    const stakeMap = new Map<string, any>();

    for (const log of logs) {
      const stakeId = log.args.stakeId?.toString();
      if (!stakeId) continue;
      if (!stakeMap.has(stakeId)) {
        stakeMap.set(stakeId, log);
      }
    }

    let synced = 0;
    let updated = 0;
    let errors = 0;

    for (const [stakeId, log] of stakeMap) {
      try {
        const { user1, user2, meetingTime } = log.args;
        if (!user1 || !user2 || !meetingTime) continue;

        const stakeData = await publicClient.readContract({
          address: CONTRACTS.STAKING as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'getStake',
          args: [BigInt(stakeId)]
        }) as any;

        const [u1Conf, u2Conf] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.STAKING as `0x${string}`,
            abi: STAKING_ABI,
            functionName: 'getConfirmation',
            args: [BigInt(stakeId), user1]
          }),
          publicClient.readContract({
            address: CONTRACTS.STAKING as `0x${string}`,
            abi: STAKING_ABI,
            functionName: 'getConfirmation',
            args: [BigInt(stakeId), user2]
          })
        ]) as any[];

        const user1Amount = Number(stakeData.user1Amount) / 1_000_000;
        const user2Amount = Number(stakeData.user2Amount) / 1_000_000;
        const totalStaked = Number(stakeData.totalStaked) / 1_000_000;

        let status = 'pending';
        if (stakeData.processed) status = 'completed';
        else if (stakeData.user1Staked && stakeData.user2Staked) status = 'active';

        const record = {
          id: stakeId,
          user1_address: user1.toLowerCase(),
          user2_address: user2.toLowerCase(),
          user1_amount: user1Amount,
          user2_amount: user2Amount,
          total_staked: totalStaked,
          meeting_time: Number(meetingTime),
          user1_staked: stakeData.user1Staked,
          user2_staked: stakeData.user2Staked,
          user1_confirmed: u1Conf[0] || false,
          user1_i_showed_up: u1Conf[1] || false,
          user1_they_showed_up: u1Conf[2] || false,
          user2_confirmed: u2Conf[0] || false,
          user2_i_showed_up: u2Conf[1] || false,
          user2_they_showed_up: u2Conf[2] || false,
          processed: stakeData.processed,
          status
        };

        const { data: existing } = await supabaseService
          .from('stakes')
          .select('id')
          .eq('id', stakeId)
          .single();

        if (existing) {
          await supabaseService.from('stakes').update(record).eq('id', stakeId);
          updated++;
        } else {
          await supabaseService.from('stakes').insert(record);
          synced++;
        }

      } catch {
        errors++;
      }
    }

    await updateLastBlock(currentBlock);

    return NextResponse.json({
      success: true,
      fromBlock: fromBlock.toString(),
      toBlock: currentBlock.toString(),
      synced,
      updated,
      errors
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}
