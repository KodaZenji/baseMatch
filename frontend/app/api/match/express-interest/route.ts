// Create this new file: /frontend/app/api/match/express-interest/route.ts
// This API will handle expressing interest and creating notifications for matches

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// POST - Record interest and check for mutual match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAddress, toAddress } = body;

    if (!fromAddress || !toAddress) {
      return NextResponse.json(
        { error: 'Missing fromAddress or toAddress' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if this interest already exists
    const { data: existingInterest, error: checkExistingError } = await supabase
      .from('interests')
      .select('*')
      .eq('from_address', fromAddress.toLowerCase())
      .eq('to_address', toAddress.toLowerCase())
      .single();

    // If interest already exists, just return success
    if (existingInterest) {
      console.log('Interest already exists:', fromAddress, '->', toAddress);
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'Interest already recorded'
      });
    }

    // Check if reverse interest exists (toAddress already liked fromAddress)
    const { data: reverseInterest, error: checkError } = await supabase
      .from('interests')
      .select('*')
      .eq('from_address', toAddress.toLowerCase())
      .eq('to_address', fromAddress.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking reverse interest:', checkError);
    }

    // Record the interest
    const { error: insertError } = await supabase
      .from('interests')
      .insert({
        from_address: fromAddress.toLowerCase(),
        to_address: toAddress.toLowerCase()
      });

    if (insertError) {
      console.error('Error inserting interest:', insertError);
      return NextResponse.json(
        { error: 'Failed to record interest' },
        { status: 500 }
      );
    }

    // If reverse interest exists, it's a match!
    if (reverseInterest) {
      console.log('🎉 MATCH DETECTED!', fromAddress, '<->', toAddress);

      // Create notifications for BOTH users
      try {
        // Get profile info for both users
        const [fromProfile, toProfile] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/profile/${toAddress}`).then(r => r.json()),
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/profile/${fromAddress}`).then(r => r.json())
        ]);

        // Notification for user who just expressed interest (fromAddress)
        await supabase
          .from('notifications')
          .insert({
            user_address: fromAddress.toLowerCase(),
            type: 'match',
            title: '💞 New Match!',
            message: `You matched with ${fromProfile.name || 'someone'}!`,
            metadata: {
              match_address: toAddress.toLowerCase(),
              match_name: fromProfile.name || 'Unknown User'
            }
          });

        // Notification for the other user (toAddress)
        await supabase
          .from('notifications')
          .insert({
            user_address: toAddress.toLowerCase(),
            type: 'match',
            title: '💖 New Match!',
            message: `You matched with ${toProfile.name || 'someone'}!`,
            metadata: {
              match_address: fromAddress.toLowerCase(),
              match_name: toProfile.name || 'Unknown User'
            }
          });

        console.log('✅ Match notifications created for both users');
      } catch (notifError) {
        console.error('Failed to create match notifications:', notifError);
      }

      return NextResponse.json({
        success: true,
        matched: true,
        message: 'It\'s a match!'
      });
    }

    return NextResponse.json({
      success: true,
      matched: false,
      message: 'Interest recorded'
    });
  } catch (error) {
    console.error('Error in POST /api/match/express-interest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
