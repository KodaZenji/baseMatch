// frontend/app/api/achievements/auto-mint/route.ts
// This API endpoint checks user stats and mints achievements automatically

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ACHIEVEMENT_ABI = [
  {
    type: "function",
    name: "mintAchievement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "achievementType", type: "string" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "getUserAchievements",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "getTokenIdFromType",
    stateMutability: "pure",
    inputs: [{ name: "achievementType", type: "string" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

const REPUTATION_ABI = [
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
  },
  {
    type: "function",
    name: "getAverageRating",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

const MATCHING_ABI = [
  {
    type: "function",
    name: "getMatches",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address[]" }]
  }
] as const;

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }

    // Initialize clients
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'),
    });

    // Get admin wallet to mint achievements
    const privateKeyStr = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKeyStr) {
      return NextResponse.json(
        { error: 'ADMIN_PRIVATE_KEY not set in environment variables' },
        { status: 500 }
      );
    }

    // Ensure key has 0x prefix and is valid hex
    const privateKeyWithPrefix = privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`;
    
    // Validate private key format (should be 66 chars with 0x or 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKeyWithPrefix)) {
      return NextResponse.json(
        { error: `Invalid ADMIN_PRIVATE_KEY format. Got: ${privateKeyWithPrefix.slice(0, 10)}... (length: ${privateKeyWithPrefix.length})` },
        { status: 500 }
      );
    }

    const adminAccount = privateKeyToAccount(privateKeyWithPrefix as `0x${string}`);
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'),
    });

    const achievementAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ADDRESS as `0x${string}`;
    const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`;
    const matchingAddress = process.env.NEXT_PUBLIC_MATCHING_ADDRESS as `0x${string}`;

    // 1. Check what achievements user already has
    const existingAchievements = await publicClient.readContract({
      address: achievementAddress,
      abi: ACHIEVEMENT_ABI,
      functionName: 'getUserAchievements',
      args: [userAddress as `0x${string}`],
    });

    // 2. Get user's reputation stats
    const reputation = await publicClient.readContract({
      address: reputationAddress,
      abi: REPUTATION_ABI,
      functionName: 'getReputation',
      args: [userAddress as `0x${string}`],
    });

    const averageRating = await publicClient.readContract({
      address: reputationAddress,
      abi: REPUTATION_ABI,
      functionName: 'getAverageRating',
      args: [userAddress as `0x${string}`],
    });

    // 3. Get user's matches
    const matches = await publicClient.readContract({
      address: matchingAddress,
      abi: MATCHING_ABI,
      functionName: 'getMatches',
      args: [userAddress as `0x${string}`],
    });

    const totalDates = Number(reputation[0]);
    const avgRating = Number(averageRating);
    const totalMatches = matches.length;

    // 4. Determine which achievements to mint based on tokenId mapping
    const achievementsToMint: Array<{ tokenId: number; type: string }> = [];

    // tokenId 1: First Date - Completed your first date!
    if (totalDates >= 1 && !hasAchievement(existingAchievements, 1)) {
      achievementsToMint.push({ tokenId: 1, type: 'First Date' });
    }

    // tokenId 2: 5 Dates - Went on 5 successful dates!
    if (totalDates >= 5 && !hasAchievement(existingAchievements, 2)) {
      achievementsToMint.push({ tokenId: 2, type: '5 Dates' });
    }

    // tokenId 3: 10 Dates - Reached 10 dates milestone!
    if (totalDates >= 10 && !hasAchievement(existingAchievements, 3)) {
      achievementsToMint.push({ tokenId: 3, type: '10 Dates' });
    }

    // tokenId 4: 5 Star Rating - Received a perfect 5-star rating!
    if (avgRating >= 5 && !hasAchievement(existingAchievements, 4)) {
      achievementsToMint.push({ tokenId: 4, type: '5 Star Rating' });
    }

    // tokenId 5: Perfect Week - Had dates every day this week!
    // This requires tracking date timestamps - implement via database or event logs
    const hasPerfectWeek = await checkPerfectWeek(userAddress);
    if (hasPerfectWeek && !hasAchievement(existingAchievements, 5)) {
      achievementsToMint.push({ tokenId: 5, type: 'Perfect Week' });
    }

    // tokenId 6: Match Maker - Helped create 10 matches!
    if (totalMatches >= 10 && !hasAchievement(existingAchievements, 6)) {
      achievementsToMint.push({ tokenId: 6, type: 'Match Maker' });
    }

    // 5. Mint the achievements
    const mintedAchievements = [];
    for (const achievement of achievementsToMint) {
      try {
        const success = await walletClient.writeContract({
          address: achievementAddress,
          abi: ACHIEVEMENT_ABI,
          functionName: 'mintAchievement',
          args: [userAddress as `0x${string}`, achievement.type],
        });

        if (!success) {
          console.log(`Achievement ${achievement.type} already earned by ${userAddress}`);
          continue;
        }

        // Get token URI
        const tokenURI = await publicClient.readContract({
          address: achievementAddress,
          abi: ACHIEVEMENT_ABI,
          functionName: 'tokenURI',
          args: [BigInt(achievement.tokenId)],
        });

        mintedAchievements.push({
          type: achievement.type,
          tokenId: achievement.tokenId,
          tokenURI: tokenURI as string,
          status: 'success'
        });

        console.log(`✅ Minted ${achievement.type} (tokenId: ${achievement.tokenId}) for ${userAddress}`);
      } catch (error) {
        console.error(`Failed to mint ${achievement.type}:`, error);
        mintedAchievements.push({
          type: achievement.type,
          tokenId: achievement.tokenId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalDates,
        averageRating: avgRating,
        totalMatches,
      },
      mintedAchievements,
      message: mintedAchievements.length > 0
        ? `Minted ${mintedAchievements.length} new achievement(s)!`
        : 'No new achievements to mint',
    });
  } catch (error) {
    console.error('Error in auto-mint:', error);
    return NextResponse.json(
      { error: 'Failed to process achievements' },
      { status: 500 }
    );
  }
}

// Helper to check if user has a specific achievement token ID
function hasAchievement(achievements: readonly bigint[], tokenId: number): boolean {
  return achievements.some(id => Number(id) === tokenId);
}

// Helper to check Perfect Week achievement
async function checkPerfectWeek(userAddress: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get dates from the past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: dateHistory, error } = await supabase
      .from('date_history')
      .select('date_occurred_at')
      .eq('user_address', userAddress.toLowerCase())
      .gte('date_occurred_at', sevenDaysAgo.toISOString())
      .order('date_occurred_at', { ascending: true });

    if (error) {
      console.error('Error checking perfect week:', error);
      return false;
    }

    if (!dateHistory || dateHistory.length < 7) return false;

    // Check if there's at least one date on each of the past 7 days
    const daysWithDates = new Set<string>();
    dateHistory.forEach(record => {
      const day = new Date(record.date_occurred_at).toISOString().split('T')[0]; // YYYY-MM-DD
      daysWithDates.add(day);
    });

    // Need 7 unique days with dates
    return daysWithDates.size >= 7;
  } catch (error) {
    console.error('Error in checkPerfectWeek:', error);
    return false;
  }
}
