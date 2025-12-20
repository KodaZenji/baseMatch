// File: frontend/app/api/stakes/pending/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Address parameter is required'
      }, { status: 400 });
    }

    const address = userAddress.toLowerCase();
    const now = Math.floor(Date.now() / 1000);

    // Find stakes where:
    // 1. User is involved (user1 or user2)
    // 2. Meeting time has passed
    // 3. Still within 48-hour window
    // 4. User hasn't confirmed yet
    // 5. Both users have staked (status is active)
    const { data: stakes, error } = await supabaseService
      .from('stakes')
      .select('*')
      .or(`user1_address.eq.${address},user2_address.eq.${address}`)
      .eq('processed', false)
      .lte('meeting_time', now) // Meeting has passed
      .gte('meeting_time', now - 48 * 60 * 60); // Within 48hr window

    if (error) {
      console.error('Error fetching stakes:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Filter and format stakes that need confirmation
    const pendingStakes = [];

    for (const stake of stakes || []) {
      const isUser1 = stake.user1_address === address;
      const hasUserConfirmed = isUser1 ? stake.user1_confirmed : stake.user2_confirmed;
      const bothStaked = stake.user1_staked && stake.user2_staked;

      // Only include if user hasn't confirmed and both users have staked
      if (!hasUserConfirmed && bothStaked) {
        const matchAddress = isUser1 ? stake.user2_address : stake.user1_address;

        // Get match profile name
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('name')
          .eq('wallet_address', matchAddress)
          .single();

        const deadline = stake.meeting_time + (48 * 60 * 60);
        const timeRemaining = deadline - now;

        pendingStakes.push({
          stakeId: stake.id,
          matchAddress,
          matchName: profile?.name || 'Your match',
          meetingTime: stake.meeting_time,
          stakeAmount: (isUser1 ? stake.user1_amount : stake.user2_amount).toString(),
          deadline,
          timeRemaining
        });
      }
    }

    return NextResponse.json({
      success: true,
      stakes: pendingStakes
    });

  } catch (error) {
    console.error('Error in pending stakes API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending stakes'
    }, { status: 500 });
  }
}
