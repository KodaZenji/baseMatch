// File: frontend/app/api/stakes/check-reminders/route.ts

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

/**
 * Public endpoint - no auth required
 * Checks all stakes that need confirmation reminders and sends notifications
 * Can be called by any user visiting the app
 */
export async function POST() {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Find all stakes where:
    // - Meeting time has passed (0-48 hours ago)
    // - Both users have staked (status is active)
    // - Not yet processed
    const { data: stakes, error: stakesError } = await supabaseService
      .from('stakes')
      .select('*')
      .eq('processed', false)
      .eq('user1_staked', true)
      .eq('user2_staked', true)
      .lte('meeting_time', now) // Meeting has passed
      .gte('meeting_time', now - 48 * 60 * 60); // Within 48hr window

    if (stakesError) {
      console.error('Error fetching stakes:', stakesError);
      return NextResponse.json({
        success: false,
        error: stakesError.message
      }, { status: 500 });
    }

    if (!stakes || stakes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stakes need reminders',
        remindersSent: 0
      });
    }

    console.log(`📋 Found ${stakes.length} stakes to check for reminders`);

    let remindersSent = 0;

    for (const stake of stakes) {
      // Check User1
      if (!stake.user1_confirmed) {
        const sent = await sendReminderIfNeeded(
          stake.id,
          stake.user1_address,
          stake.user2_address,
          stake.meeting_time,
          stake.user1_amount.toString()
        );
        if (sent) remindersSent++;
      }

      // Check User2
      if (!stake.user2_confirmed) {
        const sent = await sendReminderIfNeeded(
          stake.id,
          stake.user2_address,
          stake.user1_address,
          stake.meeting_time,
          stake.user2_amount.toString()
        );
        if (sent) remindersSent++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${stakes.length} stakes, sent ${remindersSent} reminders`,
      stakesChecked: stakes.length,
      remindersSent
    });

  } catch (error) {
    console.error('❌ Error checking reminders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check reminders'
    }, { status: 500 });
  }
}

/**
 * Send reminder if not already sent
 */
async function sendReminderIfNeeded(
  stakeId: string,
  userAddress: string,
  matchAddress: string,
  meetingTime: number,
  stakeAmount: string
): Promise<boolean> {
  try {
    // Check if reminder already sent
    const { data: existing } = await supabaseService
      .from('confirmation_reminders_sent')
      .select('id')
      .eq('stake_id', stakeId)
      .eq('user_address', userAddress.toLowerCase())
      .single();

    if (existing) {
      console.log(`✓ Reminder already sent for stake ${stakeId} to ${userAddress.slice(0, 8)}`);
      return false;
    }

    // Get match profile name
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('name')
      .eq('wallet_address', matchAddress.toLowerCase())
      .single();

    const matchName = profile?.name || 'Your match';

    // Calculate time since meeting
    const now = Math.floor(Date.now() / 1000);
    const hoursSince = Math.floor((now - meetingTime) / 3600);

    // Send notification
    const notificationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://basematch.app/api/notifications`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: userAddress.toLowerCase(),
          type: 'date_confirmation_reminder',
          title: '⏰ Time to Confirm Your Date',
          message: `Your date with ${matchName} was ${hoursSince}h ago. Please confirm what happened within 48 hours.`,
          metadata: {
            stake_id: stakeId,
            match_address: matchAddress.toLowerCase(),
            match_name: matchName,
            meeting_timestamp: meetingTime,
            stake_amount: stakeAmount,
            hours_since_meeting: hoursSince
          }
        })
      }
    );

    if (!notificationResponse.ok) {
      console.error(`Failed to send notification for stake ${stakeId}`);
      return false;
    }

    // Mark reminder as sent
    const { error: insertError } = await supabaseService
      .from('confirmation_reminders_sent')
      .insert({
        stake_id: stakeId,
        user_address: userAddress.toLowerCase()
      });

    if (insertError) {
      console.error(`Failed to mark reminder as sent:`, insertError);
      return false;
    }

    console.log(`✅ Sent reminder for stake ${stakeId} to ${userAddress.slice(0, 8)}`);
    return true;

  } catch (error) {
    console.error(`Error sending reminder for stake ${stakeId}:`, error);
    return false;
  }
}

// Optional: Add GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Reminder checker is active. Use POST to trigger a check.',
    endpoint: '/api/stakes/check-reminders',
    method: 'POST'
  });
}
