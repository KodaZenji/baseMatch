import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, STAKING_ABI } from '@/lib/contracts';

/**
 * Base Mainnet public client (Alchemy)
 * Read-only, no cron, no background jobs
 */
const publicClient = createPublicClient({
  chain: base,
  transport: http(
    `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  )
});

export async function POST(request: NextRequest) {
  try {
    const {
      stakeId,
      userAddress,
      matchAddress,
      stakeAmount,
      meetingTimestamp
    } = await request.json();

    if (
      !stakeId ||
      !userAddress ||
      !matchAddress ||
      !stakeAmount ||
      !meetingTimestamp
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('💾 Creating stake in database:', stakeId);

    /**
     * Optional blockchain verification
     * (Read-only, safe to fail)
     */
    try {
      const stakeData = await publicClient.readContract({
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'getStake',
        args: [BigInt(stakeId)]
      }) as any;

      if (
        stakeData.user1?.toLowerCase() !== userAddress.toLowerCase()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Stake data mismatch with blockchain'
          },
          { status: 400 }
        );
      }
    } catch (err) {
      console.warn(
        '⚠️ Could not verify stake on blockchain (continuing anyway):',
        err
      );
    }

    /**
     * Insert stake into database
     */
    const { error } = await supabaseService
      .from('stakes')
      .insert({
        id: stakeId,
        user1_address: userAddress.toLowerCase(),
        user2_address: matchAddress.toLowerCase(),
        user1_amount: parseFloat(stakeAmount),
        user2_amount: 0,
        total_staked: parseFloat(stakeAmount),
        meeting_time: meetingTimestamp,
        user1_staked: true,
        user2_staked: false,
        user1_confirmed: false,
        user2_confirmed: false,
        processed: false,
        status: 'pending'
      });

    if (error) {
      // Duplicate stake (idempotent behavior)
      if (error.code === '23505') {
        console.log('⚠️ Stake already exists:', stakeId);
        return NextResponse.json({
          success: true,
          message: 'Stake already exists',
          stakeId
        });
      }

      console.error('❌ Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Stake created successfully');

    return NextResponse.json({
      success: true,
      message: 'Stake created successfully',
      stakeId
    });

  } catch (error) {
    console.error('❌ Create stake error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create stake'
      },
      { status: 500 }
    );
  }
}
