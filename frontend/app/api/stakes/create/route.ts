// File: frontend/app/api/stakes/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS, STAKING_ABI } from '@/lib/contracts';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export async function POST(request: NextRequest) {
  try {
    const { stakeId, userAddress, matchAddress, stakeAmount, meetingTimestamp } = await request.json();

    if (!stakeId || !userAddress || !matchAddress || !stakeAmount || !meetingTimestamp) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    console.log('💾 Creating stake in database:', stakeId);

    // Optionally verify stake exists on blockchain
    try {
      const stakeData = await publicClient.readContract({
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'getStake',
        args: [BigInt(stakeId)]
      }) as any;

      // Verify the stake matches the provided data
      if (stakeData.user1.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json({
          success: false,
          error: 'Stake data mismatch with blockchain'
        }, { status: 400 });
      }
    } catch (err) {
      console.warn('Could not verify stake on blockchain:', err);
      // Continue anyway - blockchain might be slow
    }

    // Insert stake into database
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
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        console.log('⚠️ Stake already exists in database');
        return NextResponse.json({
          success: true,
          message: 'Stake already exists',
          stakeId
        });
      }

      console.error('❌ Database error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log('✅ Stake created successfully');

    return NextResponse.json({
      success: true,
      message: 'Stake created successfully',
      stakeId
    });

  } catch (error) {
    console.error('❌ Create stake error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create stake'
    }, { status: 500 });
  }
}
