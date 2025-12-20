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

    // Get all non-processed stakes involving this user
    // Exclude cancelled and expired stakes
    const { data: stakes, error } = await supabaseService
      .from('stakes')
      .select('*')
      .or(`user1_address.eq.${address},user2_address.eq.${address}`)
      .eq('processed', false)
      .not('status', 'in', '(cancelled,expired)');

    if (error) {
      console.error('Error fetching stakes:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Separate into categories
    const waitingForAcceptance = [];
    const needingConfirmation = [];

    for (const stake of stakes || []) {
      const isUser1 = stake.user1_address === address;
      const matchAddress = isUser1 ? stake.user2_address : stake.user1_address;

      // Get match profile name
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('name')
        .eq('wallet_address', matchAddress)
        .single();

      const matchName = profile?.name || 'Your match';

      // CATEGORY 1: Waiting for acceptance
      if (stake.user1_staked && !stake.user2_staked) {
        const createdAt = new Date(stake.created_at).getTime() / 1000;
        const timeWaiting = now - createdAt;
        const timeUntilMeeting = stake.meeting_time - now;
        const hasMeetingPassed = stake.meeting_time < now;

        if (isUser1) {
          // User1 (creator) - can cancel before meeting or claim refund after
          waitingForAcceptance.push({
            stakeId: stake.id,
            matchAddress,
            matchName,
            meetingTime: stake.meeting_time,
            stakeAmount: stake.user1_amount.toString(),
            timeWaiting,
            timeUntilMeeting,
            hasMeetingPassed,
            canCancel: true,
            role: 'creator'
          });
        } else {
          // User2 (acceptor) - can only accept if meeting hasn't passed
          if (!hasMeetingPassed) {
            waitingForAcceptance.push({
              stakeId: stake.id,
              matchAddress,
              matchName,
              meetingTime: stake.meeting_time,
              stakeAmount: stake.user2_amount || stake.user1_amount, // Amount they need to stake
              timeWaiting,
              timeUntilMeeting,
              hasMeetingPassed: false,
              canCancel: false,
              role: 'acceptor'
            });
          }
        }
      }

      // CATEGORY 2: Both staked, need to confirm date outcome
      if (stake.user1_staked && stake.user2_staked) {
        const meetingPassed = stake.meeting_time < now;
        const windowOpen = now < stake.meeting_time + (48 * 60 * 60);
        const hasUserConfirmed = isUser1 ? stake.user1_confirmed : stake.user2_confirmed;

        // Only show if meeting passed, window open, and user hasn't confirmed
        if (meetingPassed && windowOpen && !hasUserConfirmed) {
          const deadline = stake.meeting_time + (48 * 60 * 60);
          const timeRemaining = deadline - now;

          needingConfirmation.push({
            stakeId: stake.id,
            matchAddress,
            matchName,
            meetingTime: stake.meeting_time,
            stakeAmount: (isUser1 ? stake.user1_amount : stake.user2_amount).toString(),
            deadline,
            timeRemaining
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      waitingForAcceptance,
      needingConfirmation
    });

  } catch (error) {
    console.error('Error in pending stakes API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending stakes'
    }, { status: 500 });
  }
}
