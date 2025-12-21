// frontend/app/api/achievements/auto-mint/route.ts
// FIXED: Added notification creation after successful achievement minting

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ✅ NEW: Helper function to create achievement notification
async function createAchievementNotification(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userAddress: string,
  achievementType: string,
  tokenId: number,
  tokenURI: string
) {
  try {
    // Get the achievement emoji based on type
    const emoji = getAchievementEmoji(achievementType);
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_address: userAddress.toLowerCase(),
        type: 'achievement_unlocked',
        title: `${emoji} Achievement Unlocked!`,
        message: `Congratulations! You've earned the "${achievementType}" badge!`,
        metadata: {
          achievement_type: achievementType,
          token_id: tokenId,
          token_uri: tokenURI
        }
      });

    if (error) {
      console.error('Failed to create notification:', error);
    } else {
      console.log(`✅ Created notification for ${achievementType}`);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// ✅ NEW: Helper to get emoji for achievement type
function getAchievementEmoji(type: string): string {
  const emojiMap: { [key: string]: string } = {
    'First Date': '🎯',
    '5 Dates': '🔥',
    '10 Dates': '💎',
    '5 Star Rating': '⭐',
    'Perfect Week': '🏆',
    'Match Maker': '💘'
  };
  return emojiMap[type] || '🏅';
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }

    console.log(`🏆 Checking achievements for ${userAddress}`);

    // Initialize clients
    const supabase = getSupabaseAdmin();
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'),
    });

    const privateKeyStr = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKeyStr) {
      return NextResponse.json(
        { error: 'ADMIN_PRIVATE_KEY not set' },
        { status: 500 }
      );
    }

    const privateKeyWithPrefix = privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`;

    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKeyWithPrefix)) {
      return NextResponse.json(
        { error: 'Invalid ADMIN_PRIVATE_KEY format' },
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

    // 1. Get existing achievements from blockchain
    const existingAchievements = await publicClient.readContract({
      address: achievementAddress,
      abi: ACHIEVEMENT_ABI,
      functionName: 'getUserAchievements',
      args: [userAddress as `0x${string}`],
    });

    console.log('📊 Existing achievements on-chain:', existingAchievements.map(id => Number(id)));

    // 2. Get reputation from blockchain (SOURCE OF TRUTH)
    const reputation = await publicClient.readContract({
      address: reputationAddress,
      abi: REPUTATION_ABI,
      functionName: 'getReputation',
      args: [userAddress as `0x${string}`],
    });

    const totalDatesBlockchain = Number(reputation[0]);
    const noShows = Number(reputation[1]);
    console.log(`📅 Total dates from BLOCKCHAIN: ${totalDatesBlockchain}`);
    console.log(`❌ No-shows: ${noShows}`);

    // 3. Get current database count
    const { data: dbDateHistory, error: dbError } = await supabase
      .from('date_history')
      .select('id')
      .eq('user_address', userAddress.toLowerCase());

    const totalDatesDB = dbDateHistory?.length || 0;
    console.log(`💾 Total dates in DATABASE: ${totalDatesDB}`);

    // 4. Sync database with blockchain if out of sync
    if (totalDatesBlockchain > totalDatesDB) {
      const datesToAdd = totalDatesBlockchain - totalDatesDB;
      console.log(`⚠️ Database out of sync! Adding ${datesToAdd} date record(s)...`);
      
      const newRecords = Array.from({ length: datesToAdd }, (_, i) => ({
        user_address: userAddress.toLowerCase(),
        date_occurred_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('date_history')
        .insert(newRecords);

      if (insertError) {
        console.error('Failed to sync database:', insertError);
      } else {
        console.log(`✅ Added ${datesToAdd} date(s) to database`);
      }
    } else if (totalDatesBlockchain === totalDatesDB) {
      console.log('✅ Database is in sync with blockchain');
    } else {
      console.log('⚠️ Database has MORE dates than blockchain (unusual)');
    }

    // 5. Get average rating
    let avgRating = 0;
    try {
      const averageRatingBigInt = await publicClient.readContract({
        address: reputationAddress,
        abi: REPUTATION_ABI,
        functionName: 'getAverageRating',
        args: [userAddress as `0x${string}`],
      });
      avgRating = Number(averageRatingBigInt) / 100;
      console.log(`⭐ Average rating: ${avgRating}`);
    } catch (error) {
      console.log('ℹ️ No ratings yet');
    }

    // 6. Get matches
    let totalMatches = 0;
    try {
      const matches = await publicClient.readContract({
        address: matchingAddress,
        abi: MATCHING_ABI,
        functionName: 'getMatches',
        args: [userAddress as `0x${string}`],
      });
      totalMatches = matches.length;
      console.log(`🤝 Total matches: ${totalMatches}`);
    } catch (error) {
      console.log('ℹ️ No matches yet');
    }

    // 7. Determine achievements to mint (using BLOCKCHAIN data)
    const achievementsToMint: Array<{ tokenId: number; type: string; reason: string }> = [];

    // tokenId 1: First Date
    if (totalDatesBlockchain >= 1 && !hasAchievement(existingAchievements, 1)) {
      achievementsToMint.push({ 
        tokenId: 1, 
        type: 'First Date',
        reason: `User has ${totalDatesBlockchain} date(s) on blockchain`
      });
      console.log('✅ Qualifies for First Date achievement');
    }

    // tokenId 2: 5 Dates
    if (totalDatesBlockchain >= 5 && !hasAchievement(existingAchievements, 2)) {
      achievementsToMint.push({ 
        tokenId: 2, 
        type: '5 Dates',
        reason: `User has ${totalDatesBlockchain} dates on blockchain`
      });
      console.log('✅ Qualifies for 5 Dates achievement');
    }

    // tokenId 3: 10 Dates
    if (totalDatesBlockchain >= 10 && !hasAchievement(existingAchievements, 3)) {
      achievementsToMint.push({ 
        tokenId: 3, 
        type: '10 Dates',
        reason: `User has ${totalDatesBlockchain} dates on blockchain`
      });
      console.log('✅ Qualifies for 10 Dates achievement');
    }

    // tokenId 4: 5 Star Rating
    if (avgRating >= 5 && !hasAchievement(existingAchievements, 4)) {
      achievementsToMint.push({ 
        tokenId: 4, 
        type: '5 Star Rating',
        reason: `User has ${avgRating} average rating`
      });
      console.log('✅ Qualifies for 5 Star Rating achievement');
    }

    // tokenId 5: Perfect Week (use DB for this since it requires date tracking)
    const { data: recentDates } = await supabase
      .from('date_history')
      .select('date_occurred_at')
      .eq('user_address', userAddress.toLowerCase())
      .gte('date_occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('date_occurred_at', { ascending: true });

    const hasPerfectWeek = checkPerfectWeek(recentDates || []);
    if (hasPerfectWeek && !hasAchievement(existingAchievements, 5)) {
      achievementsToMint.push({ 
        tokenId: 5, 
        type: 'Perfect Week',
        reason: 'User has dates on 7 consecutive days'
      });
      console.log('✅ Qualifies for Perfect Week achievement');
    }

    // tokenId 6: Match Maker
    if (totalMatches >= 10 && !hasAchievement(existingAchievements, 6)) {
      achievementsToMint.push({ 
        tokenId: 6, 
        type: 'Match Maker',
        reason: `User has ${totalMatches} matches`
      });
      console.log('✅ Qualifies for Match Maker achievement');
    }

    if (achievementsToMint.length === 0) {
      console.log('ℹ️ No new achievements to mint');
      return NextResponse.json({
        success: true,
        stats: {
          totalDatesBlockchain,
          totalDatesDB,
          synced: totalDatesBlockchain === totalDatesDB,
          averageRating: avgRating,
          totalMatches,
        },
        mintedAchievements: [],
        message: 'No new achievements to mint',
      });
    }

    console.log(`🎯 Attempting to mint ${achievementsToMint.length} achievement(s):`, 
      achievementsToMint.map(a => a.type).join(', '));

    // 8. Mint achievements
    const mintedAchievements = [];
    for (const achievement of achievementsToMint) {
      try {
        console.log(`🔨 Minting ${achievement.type} (tokenId: ${achievement.tokenId})...`);
        
        const hash = await walletClient.writeContract({
          address: achievementAddress,
          abi: ACHIEVEMENT_ABI,
          functionName: 'mintAchievement',
          args: [userAddress as `0x${string}`, achievement.type],
        });

        console.log(`⛓️ Transaction hash: ${hash}`);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

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
          reason: achievement.reason,
          transactionHash: hash,
          blockNumber: receipt.blockNumber.toString(),
          status: 'success'
        });

        // Save to database as backup
        try {
          await supabase.from('achievements').insert({
            user_address: userAddress.toLowerCase(),
            achievement_type: achievement.type,
            token_id: achievement.tokenId,
            transaction_hash: hash,
            block_number: receipt.blockNumber.toString(),
          });
          console.log(`💾 Saved achievement to database`);
        } catch (dbError) {
          console.log(`⚠️ Failed to save to database (non-critical):`, dbError);
        }

        // ✅ NEW: Create notification for the user
        await createAchievementNotification(
          supabase,
          userAddress,
          achievement.type,
          achievement.tokenId,
          tokenURI as string
        );

        console.log(`✅ Successfully minted ${achievement.type}`);
      } catch (error) {
        console.error(`❌ Failed to mint ${achievement.type}:`, error);
        
        // Check if it's because achievement already exists
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const alreadyMinted = errorMessage.includes('already') || errorMessage.includes('exists');
        
        mintedAchievements.push({
          type: achievement.type,
          tokenId: achievement.tokenId,
          reason: achievement.reason,
          status: alreadyMinted ? 'already_minted' : 'failed',
          error: errorMessage
        });
      }
    }

    const successfulMints = mintedAchievements.filter(a => a.status === 'success');
    console.log(`🎉 Successfully minted ${successfulMints.length}/${achievementsToMint.length} achievements`);

    return NextResponse.json({
      success: true,
      stats: {
        totalDatesBlockchain,
        totalDatesDB,
        synced: totalDatesBlockchain === (totalDatesDB + (totalDatesBlockchain - totalDatesDB)),
        averageRating: avgRating,
        totalMatches,
      },
      mintedAchievements,
      message: successfulMints.length > 0
        ? `Minted ${successfulMints.length} new achievement(s)!`
        : achievementsToMint.length > 0 
          ? 'Achievements already minted or failed to mint'
          : 'No new achievements to mint',
    });
  } catch (error) {
    console.error('❌ Error in auto-mint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process achievements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function hasAchievement(achievements: readonly bigint[], tokenId: number): boolean {
  const has = achievements.some(id => Number(id) === tokenId);
  if (has) {
    console.log(`ℹ️ User already has achievement tokenId ${tokenId}`);
  }
  return has;
}

function checkPerfectWeek(recentDates: Array<{ date_occurred_at: string }>): boolean {
  if (recentDates.length < 7) return false;

  const daysWithDates = new Set<string>();
  recentDates.forEach(record => {
    const day = new Date(record.date_occurred_at).toISOString().split('T')[0];
    daysWithDates.add(day);
  });

  return daysWithDates.size >= 7;
}
