
// File: frontend/app/api/stakes/check-reminders/route.ts
// FIXED: Query blockchain for confirmation status before sending reminders

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';

// Create viem client for reading blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`)
});

// Helper function to get confirmation status from blockchain
async function getBlockchainConfirmationStatus(stakeId: string, userAddress: string) {
  try {
    const confirmationData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'getConfirmation',
      args: [BigInt(stakeId), userAddress as `0x${string}`]
    }) as any;

    return {
      hasConfirmed: confirmationData[0] || false,
      iShowedUp: confirmationData[1] || false,
      theyShowedUp: confirmationData[2] || false
    };
  } catch (error) {
    console.error(`Failed to read confirmation for stake ${stakeId}:`, error);
    return null;
  }
}

// In-memory cache for recently sent reminders to prevent duplicates within the same request
const recentlySentReminders = new Map<string, number>();
const REMINDER_CACHE_TIME = 5 * 60 * 1000; // 5 minutes cache

// Clean up old entries periodically
let cleanupInterval: NodeJS.Timeout;
if (typeof setInterval !== 'undefined') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentlySentReminders.entries()) {
      if (now - timestamp > REMINDER_CACHE_TIME) {
        recentlySentReminders.delete(key);
      }
    }
  }, 60 * 1000); // Clean up every minute

  // Ensure the interval doesn't prevent the process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Public endpoint - no auth required
 * Checks all stakes that need confirmation reminders and sends notifications
 * Can be called by any user visiting the app
 * 
 * RACE CONDITION PROTECTION:
 * - Uses database unique constraint on (stake_id, user_address)
 * - Marks reminder as sent BEFORE sending notification
 * - Handles duplicate insert errors gracefully
 */
export async function POST() {
  try {
    const nowSeconds = Math.floor(Date.now() / 1000);

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
      .lte('meeting_time', nowSeconds) // Meeting has passed
      .gte('meeting_time', nowSeconds - 48 * 60 * 60); // Within 48hr window

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
    let alreadySent = 0;
    let failed = 0;

    for (const stake of stakes) {
      console.log(`🔍 Checking stake ${stake.id} for reminders`);

      // ✅ QUERY BLOCKCHAIN for User1 confirmation status
      const user1BlockchainConfirmation = await getBlockchainConfirmationStatus(
        stake.id,
        stake.user1_address
      );
      
      const user1Confirmed = user1BlockchainConfirmation 
        ? user1BlockchainConfirmation.hasConfirmed 
        : stake.user1_confirmed; // Fallback to database

      // Check User1 - only if not already confirmed ON BLOCKCHAIN
      if (!user1Confirmed) {
        console.log(`📧 User1 (${stake.user1_address}) has NOT confirmed stake ${stake.id} on blockchain`);
        const result = await sendReminderIfNeeded(
          stake.id,
          stake.user1_address,
          stake.user2_address,
          stake.meeting_time,
          stake.user1_amount.toString()
        );
        if (result === 'sent') remindersSent++;
        else if (result === 'already_sent') alreadySent++;
        else if (result === 'failed') failed++;
      } else {
        console.log(`✅ User1 already confirmed stake ${stake.id} on blockchain`);
        
        // ✅ Update database to match blockchain
        if (!stake.user1_confirmed) {
          console.log(`🔄 Syncing User1 confirmation to database for stake ${stake.id}`);
          await supabaseService
            .from('stakes')
            .update({ user1_confirmed: true })
            .eq('id', stake.id);
        }
      }

      // ✅ QUERY BLOCKCHAIN for User2 confirmation status
      const user2BlockchainConfirmation = await getBlockchainConfirmationStatus(
        stake.id,
        stake.user2_address
      );
      
      const user2Confirmed = user2BlockchainConfirmation 
        ? user2BlockchainConfirmation.hasConfirmed 
        : stake.user2_confirmed; // Fallback to database

      // Check User2 - only if not already confirmed ON BLOCKCHAIN
      if (!user2Confirmed) {
        console.log(`📧 User2 (${stake.user2_address}) has NOT confirmed stake ${stake.id} on blockchain`);
        const result = await sendReminderIfNeeded(
          stake.id,
          stake.user2_address,
          stake.user1_address,
          stake.meeting_time,
          stake.user2_amount.toString()
        );
        if (result === 'sent') remindersSent++;
        else if (result === 'already_sent') alreadySent++;
        else if (result === 'failed') failed++;
      } else {
        console.log(`✅ User2 already confirmed stake ${stake.id} on blockchain`);
        
        // ✅ Update database to match blockchain
        if (!stake.user2_confirmed) {
          console.log(`🔄 Syncing User2 confirmation to database for stake ${stake.id}`);
          await supabaseService
            .from('stakes')
            .update({ user2_confirmed: true })
            .eq('id', stake.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${stakes.length} stakes, sent ${remindersSent} reminders`,
      stakesChecked: stakes.length,
      remindersSent,
      alreadySent,
      failed
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
 * Returns: 'sent' | 'already_sent' | 'failed'
 * 
 * CRITICAL: Inserts tracking record BEFORE sending notification
 * This prevents race conditions from concurrent executions
 */
async function sendReminderIfNeeded(
  stakeId: string,
  userAddress: string,
  matchAddress: string,
  meetingTime: number,
  stakeAmount: string
): Promise<'sent' | 'already_sent' | 'failed'> {
  try {
    const userAddressLower = userAddress.toLowerCase();
    const matchAddressLower = matchAddress.toLowerCase();
    const reminderKey = `${stakeId}-${userAddressLower}`;

    // First check in-memory cache to prevent duplicates within same request
    if (recentlySentReminders.has(reminderKey)) {
      console.log(`✓ Reminder already sent (in-memory) for stake ${stakeId} to ${userAddressLower.slice(0, 8)}`);
      return 'already_sent';
    }

    // STEP 1: Try to insert tracking record FIRST
    // This acts as a distributed lock - only one process can succeed
    const { error: insertError } = await supabaseService
      .from('confirmation_reminders_sent')
      .insert({
        stake_id: stakeId,
        user_address: userAddressLower
      });

    // If insert failed, reminder was already sent (or DB error)
    if (insertError) {
      // Check if it's a duplicate key error (code 23505 in PostgreSQL)
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        console.log(`✓ Reminder already sent for stake ${stakeId} to ${userAddressLower.slice(0, 8)}`);
        // Add to in-memory cache
        recentlySentReminders.set(reminderKey, Date.now());
        return 'already_sent';
      }

      // Other database error
      console.error(`❌ Database error inserting reminder for stake ${stakeId}:`, insertError);
      return 'failed';
    }

    console.log(`🔒 Locked reminder slot for stake ${stakeId} to ${userAddressLower}`);
    // Add to in-memory cache
    recentlySentReminders.set(reminderKey, Date.now());

    // STEP 2: Now that we've locked this reminder, send the notification
    try {
      // Get match profile name
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('name')
        .eq('wallet_address', matchAddressLower)
        .single();

      const matchName = profile?.name || 'Your match';

      // Calculate time since meeting
      const now = Math.floor(Date.now() / 1000);
      const hoursSince = Math.floor((now - meetingTime) / 3600);

      // Create dynamic time description
      const timeDescription = hoursSince === 0 ? 'just now' :
        hoursSince < 24 ? `${hoursSince}h ago` :
          `${Math.floor(hoursSince / 24)}d ago`;

      // Send notification
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://basematch.app';
      const notificationResponse = await fetch(
        `${appUrl}/api/notifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: userAddressLower,
            type: 'date_confirmation_reminder',
            title: '⏰ Time to Confirm Your Date',
            message: `Your date with ${matchName} was ${timeDescription}. Please confirm what happened within 48 hours.`,
            metadata: {
              stake_id: stakeId,
              match_address: matchAddressLower,
              match_name: matchName,
              meeting_timestamp: meetingTime,
              stake_amount: stakeAmount,
              hours_since_meeting: hoursSince
            }
          })
        }
      );

      if (!notificationResponse.ok) {
        const errorText = await notificationResponse.text();
        console.error(`❌ Failed to send notification for stake ${stakeId}:`, errorText);

        // Notification failed but we've already marked it as sent
        // This is acceptable - prevents infinite retry loops
        // The user can still see the reminder in StakeReminderBanner
        return 'failed';
      }

      console.log(`✅ Sent reminder for stake ${stakeId} to ${userAddressLower.slice(0, 8)}`);
      return 'sent';

    } catch (notificationError) {
      console.error(`❌ Error sending notification for stake ${stakeId}:`, notificationError);
      // Already marked as sent in DB, so return 'failed' not 'already_sent'
      return 'failed';
    }

  } catch (error) {
    console.error(`❌ Unexpected error for stake ${stakeId}:`, error);
    return 'failed';
  }
}

// Optional: Add GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Reminder checker is active. Use POST to trigger a check.',
    endpoint: '/api/stakes/check-reminders',
    method: 'POST',
    note: 'Protected against race conditions via database constraints'
  });
}
