// frontend/app/api/backfill-dates/route.ts
// API endpoint to backfill missing dates to Reputation contract

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

const STAKING_ABI = [
  {
    type: "function",
    name: "getConfirmation",
    stateMutability: "view",
    inputs: [
      { name: "stakeId", type: "uint256" },
      { name: "user", type: "address" }
    ],
    outputs: [
      { name: "hasConfirmed", type: "bool" },
      { name: "iShowedUp", type: "bool" },
      { name: "theyShowedUp", type: "bool" }
    ]
  }
] as const;

const REPUTATION_ABI = [
  {
    type: "function",
    name: "recordDate",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "recordNoShow",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "getReputation",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalDates", type: "uint256" },
      { name: "noShows", type: "uint256" },
      { name: "totalRating", type: "uint256" },
      { name: "ratingCount", type: "uint256" }
    ]
  }
] as const;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getBlockchainClients() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  });

  const privateKeyStr = process.env.ADMIN_PRIVATE_KEY!;
  const privateKeyWithPrefix = privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`;
  const adminAccount = privateKeyToAccount(privateKeyWithPrefix as `0x${string}`);
  
  const walletClient = createWalletClient({
    account: adminAccount,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  });

  return { publicClient, walletClient };
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    console.log('🔄 Starting backfill...');
    
    const supabase = getSupabaseAdmin();
    const { publicClient, walletClient } = getBlockchainClients();

    const stakingAddress = process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`;
    const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`;

    // If userAddress provided, only backfill for that user
    let query = supabase
      .from('stakes')
      .select('*')
      .or('user1_confirmed.eq.true,user2_confirmed.eq.true');

    if (userAddress) {
      console.log(`🎯 Backfilling for user: ${userAddress}`);
      query = query.or(`user1_address.eq.${userAddress},user2_address.eq.${userAddress}`);
    } else {
      console.log('🎯 Backfilling for ALL users');
    }

    const { data: stakes, error } = await query;

    if (error || !stakes) {
      return NextResponse.json({ error: 'Failed to fetch stakes' }, { status: 500 });
    }

    console.log(`📊 Found ${stakes.length} stakes`);

    const usersToUpdate = new Map<string, { dates: number; noShows: number }>();

    // Collect all the updates needed
    for (const stake of stakes) {
      try {
        const user1Confirmation = await publicClient.readContract({
          address: stakingAddress,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stake.id), stake.user1_address as `0x${string}`]
        });

        const user2Confirmation = await publicClient.readContract({
          address: stakingAddress,
          abi: STAKING_ABI,
          functionName: 'getConfirmation',
          args: [BigInt(stake.id), stake.user2_address as `0x${string}`]
        });

        // User1
        if (user1Confirmation[0]) {
          const stats = usersToUpdate.get(stake.user1_address.toLowerCase()) || { dates: 0, noShows: 0 };
          if (user1Confirmation[1]) {
            stats.dates++;
          } else {
            stats.noShows++;
          }
          usersToUpdate.set(stake.user1_address.toLowerCase(), stats);
        }

        // User2
        if (user2Confirmation[0]) {
          const stats = usersToUpdate.get(stake.user2_address.toLowerCase()) || { dates: 0, noShows: 0 };
          if (user2Confirmation[1]) {
            stats.dates++;
          } else {
            stats.noShows++;
          }
          usersToUpdate.set(stake.user2_address.toLowerCase(), stats);
        }
      } catch (error) {
        console.error(`Failed to read stake ${stake.id}:`, error);
      }
    }

    console.log(`📝 ${usersToUpdate.size} users need updates`);

    // Update reputation for each user
    const results = [];
    for (const [address, stats] of usersToUpdate) {
      try {
        console.log(`\n👤 Updating ${address}...`);
        
        // Get current reputation
        const repBefore = await publicClient.readContract({
          address: reputationAddress,
          abi: REPUTATION_ABI,
          functionName: 'getReputation',
          args: [address as `0x${string}`]
        });

        const txHashes = [];

        // Record dates
        for (let i = 0; i < stats.dates; i++) {
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'recordDate',
            args: [address as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
          txHashes.push(hash);
          console.log(`  ✅ Date recorded: ${hash}`);
        }

        // Record no-shows
        for (let i = 0; i < stats.noShows; i++) {
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'recordNoShow',
            args: [address as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
          txHashes.push(hash);
          console.log(`  ✅ No-show recorded: ${hash}`);
        }

        const repAfter = await publicClient.readContract({
          address: reputationAddress,
          abi: REPUTATION_ABI,
          functionName: 'getReputation',
          args: [address as `0x${string}`]
        });

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
          added: {
            dates: stats.dates,
            noShows: stats.noShows
          },
          txHashes
        });

      } catch (error) {
        console.error(`Failed to update ${address}:`, error);
        results.push({
          address,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('✅ Backfill complete!');

    return NextResponse.json({
      success: true,
      message: `Backfilled ${usersToUpdate.size} users`,
      results
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({
      error: 'Backfill failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
