// frontend/app/api/date/record/route.ts
// FIXED: Records date for BOTH users involved in a stake

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both old format (just userAddress) and new format (full stake info)
    const { 
      userAddress,       // Old format - for backward compatibility
      stakeId,           // New format
      user1Address,      // New format
      user2Address,      // New format
      meetingTime,       // New format
      bothShowedUp,      // New format
      user1ShowedUp,     // New format
      user2ShowedUp      // New format
    } = body;

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // NEW FORMAT: Record for both users when full stake info is provided
    if (stakeId && user1Address && user2Address) {
      console.log(`📝 Recording date for both users from stake ${stakeId}`);
      
      const recordsToInsert = [];

      // Record for user1 if they showed up
      if (user1ShowedUp) {
        const { data: existingUser1Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user1Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser1Date) {
          recordsToInsert.push({
            user_address: user1Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });
        }
      }

      // Record for user2 if they showed up
      if (user2ShowedUp) {
        const { data: existingUser2Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user2Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser2Date) {
          recordsToInsert.push({
            user_address: user2Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });
        }
      }

      if (recordsToInsert.length > 0) {
        const { error } = await supabase
          .from('date_history')
          .insert(recordsToInsert);

        if (error) {
          console.error('Error recording dates:', error);
          return NextResponse.json({ error: 'Failed to record dates' }, { status: 500 });
        }

        console.log(`✅ Recorded ${recordsToInsert.length} date(s) for stake ${stakeId}`);
      } else {
        console.log(`ℹ️ Dates already recorded for today for stake ${stakeId}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Recorded ${recordsToInsert.length} date(s) successfully`,
        recordsCreated: recordsToInsert.length
      });
    }

    // OLD FORMAT: Single user address (backward compatibility for RatingModal)
    if (userAddress) {
      console.log(`📝 Recording date for single user (old format): ${userAddress}`);
      
      // Check if user already has a date recorded today
      const { data: existingDate, error: checkError } = await supabase
        .from('date_history')
        .select('id')
        .eq('user_address', userAddress.toLowerCase())
        .gte('date_occurred_at', `${today}T00:00:00Z`)
        .lte('date_occurred_at', `${today}T23:59:59Z`)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing date:', checkError);
        return NextResponse.json({ error: 'Failed to check date history' }, { status: 500 });
      }

      if (existingDate) {
        return NextResponse.json({ 
          success: true, 
          message: 'Date already recorded for today' 
        });
      }

      // Record that this user had a date today
      const { error } = await supabase
        .from('date_history')
        .insert({
          user_address: userAddress.toLowerCase(),
          date_occurred_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error recording date:', error);
        return NextResponse.json({ error: 'Failed to record date' }, { status: 500 });
      }

      console.log(`✅ Recorded date for ${userAddress}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Date recorded successfully' 
      });
    }

    // No valid parameters provided
    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in POST /api/date/record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
