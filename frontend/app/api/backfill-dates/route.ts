import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

/* =======================
   ABIs
======================= */

const STAKING_ABI = [
  {
    type: 'function',
    name: 'getConfirmation',
    stateMutability: 'view',
    inputs: [
      { name: 'stakeId', type: 'uint256' },
      { name: 'user', type: 'address' }
    ],
    outputs: [
      { name: 'hasConfirmed', type: 'bool' },
      { name: 'iShowedUp', type: 'bool' },
      { name: 'theyShowedUp', type: 'bool' }
    ]
  }
] as const;

const REPUTATION_ABI = [
  {
    type: 'function',
    name: 'recordDate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'recordNoShow',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'getReputation',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalDates', type: 'uint256' },
      { name: 'noShows', type: 'uint256' },
      { name: 'totalRating', type: 'uint256' },
      { name: 'ratingCount', type: 'uint256' }
    ]
  }
] as const;

/* =======================
   Supabase (admin)
======================= */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/* =======================
   Blockchain clients
   (Base mainnet + Alchemy)
======================= */

function getBlockchainClients() {
  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl)
  });

  const pk = process.env.ADMIN_PRIVATE_KEY!;
  const adminAccount = privateKeyToAccount(
    pk.startsWith('0x') ? pk as `0x${string}` : `0x${pk}`
  );

  const walletClient = createWalletClient({
    account: adminAccount,
    chain: base,
    transport: http(rpcUrl)
  });

  return { publicClient, walletClient };
}

/* =======================
   POST — Manual backfill
======================= */

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    console.log('🔄 Starting reputation backfill (manual)');

    const supabase = getSupabaseAdmin();
    const { publicClient, walletClient } = getBlockchainClients();

    const stakingAddress =
      process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`;
    const reputationAddress =
      process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`;

    /**
     * Fetch confirmed stakes
     */
    let query = supabase
      .from('stakes')
      .select('*')
      .or('user1_confirmed.eq.true,user2_confirmed.eq.true');

    if (userAddress) {
      console.log(`🎯 Backfilling only for ${userAddress}`);
      query = query.or(
        `user1_address.eq.${userAddress},user2_address.eq.${userAddress}`
      );
    }

    const { data: stakes, error } = await query;

    if (error || !stakes) {
      return NextResponse.json(
        { error: 'Failed to fetch stakes' },
        { status: 500 }
      );
    }

    console.log(`📊 ${stakes.length} stakes found`);

    const usersToUpdate = new Map<
      string,
      { dates: number; noShows: number }
    >();

    /**
     * Read confirmations from blockchain
     */
    for (const stake of stakes) {
      try {
        const [u1, u2] = await Promise.all([
          publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getConfirmation',
            args: [BigInt(stake.id), stake.user1_address]
          }),
          publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_ABI,
            functionName: 'getConfirmation',
            args: [BigInt(stake.id), stake.user2_address]
          })
        ]) as any[];

        // User1
        if (u1[0]) {
          const stats =
            usersToUpdate.get(stake.user1_address) || {
              dates: 0,
              noShows: 0
            };
          u1[1] ? stats.dates++ : stats.noShows++;
          usersToUpdate.set(stake.user1_address, stats);
        }

        // User2
        if (u2[0]) {
          const stats =
            usersToUpdate.get(stake.user2_address) || {
              dates: 0,
              noShows: 0
            };
          u2[1] ? stats.dates++ : stats.noShows++;
          usersToUpdate.set(stake.user2_address, stats);
        }
      } catch (err) {
        console.error(`Failed reading stake ${stake.id}`, err);
      }
    }

    console.log(`🧮 ${usersToUpdate.size} users to update`);

    /**
     * Write reputation updates
     */
    const results = [];

    for (const [address, stats] of usersToUpdate) {
      try {
        console.log(`👤 Updating ${address}`);

        const repBefore = await publicClient.readContract({
          address: reputationAddress,
          abi: REPUTATION_ABI,
          functionName: 'getReputation',
          args: [address as `0x${string}`]
        }) as any;

        const txHashes: string[] = [];

        for (let i = 0; i < stats.dates; i++) {
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'recordDate',
            args: [address as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
          txHashes.push(hash);
        }

        for (let i = 0; i < stats.noShows; i++) {
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'recordNoShow',
            args: [address as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
          txHashes.push(hash);
        }

        const repAfter = await publicClient.readContract({
          address: reputationAddress,
          abi: REPUTATION_ABI,
          functionName: 'getReputation',
          args: [address as `0x${string}`]
        }) as any;

        results.push({
          address,
          before: {
            totalDates: Number(repBefore[0]),
            noShows: Number(repBefore[1])
          },
          after: {
            totalDates: Number(repAfter[0]),
            noShows: Number(repAfter[1])
          },
          added: stats,
          txHashes
        });

      } catch (err) {
        console.error(`Failed updating ${address}`, err);
        results.push({
          address,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log('✅ Backfill complete');

    return NextResponse.json({
      success: true,
      updatedUsers: usersToUpdate.size,
      results
    });

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Backfill failed'
      },
      { status: 500 }
    );
  }
}
