// File: frontend/app/api/stakes/cancel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: NextRequest) {
  try {
    const { stakeId, userAddress, expired } = await request.json();

    if (!stakeId || !userAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing stakeId or userAddress'
      }, { status: 400 });
    }

    const address = userAddress.toLowerCase();

    // Get the stake
    const { data: stake, error: fetchError } = await supabaseService
      .from('stakes')
      .select('*')
      .eq('id', stakeId)
      .single();

    if (fetchError || !stake) {
      return NextResponse.json({
        success: false,
        error: 'Stake not found'
      }, { status: 404 });
    }

    // Verify user is user1 (creator)
    if (stake.user1_address !== address) {
      return NextResponse.json({
        success: false,
        error: 'Only the stake creator can cancel or claim refund'
      }, { status: 403 });
    }

    // Verify stake is still pending (user2 hasn't staked yet)
    if (stake.user2_staked) {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel - stake has been accepted'
      }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const hasMeetingPassed = stake.meeting_time < now;

    // Determine the status based on context
    let newStatus = 'cancelled';
    let notificationTitle = '❌ Date Stake Cancelled';
    let notificationMessage = 'Your match cancelled the date stake';

    if (expired || hasMeetingPassed) {
      // Meeting time passed without acceptance - this is an expiration
      newStatus = 'expired';
      notificationTitle = '⏰ Date Stake Expired';
      notificationMessage = 'The date stake expired as it was not accepted in time';
    }

    // Update stake status
    const { error: updateError } = await supabaseService
      .from('stakes')
      .update({
        status: newStatus,
        processed: true, // Mark as processed so it doesn't appear in pending queries
        updated_at: new Date().toISOString()
      })
      .eq('id', stakeId);

    if (updateError) {
      console.error('Error updating stake:', updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 });
    }

    // Send notification to user2 (only if it's a cancellation, not expiration)
    if (newStatus === 'cancelled') {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${appUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: stake.user2_address,
            type: 'stake_cancelled',
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
              stake_id: stakeId
            }
          })
        });
      } catch (err) {
        console.error('Failed to send notification:', err);
        // Don't fail the whole operation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: newStatus === 'expired' 
        ? 'Stake processed as expired. You can now claim your refund from the blockchain.'
        : 'Stake cancelled successfully. Your USDC will be returned.',
      status: newStatus
    });

  } catch (error) {
    console.error('Error processing stake:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process stake'
    }, { status: 500 });
  }
        }
