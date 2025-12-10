// frontend/app/api/date/record/route.ts
// Records that a date occurred for Perfect Week tracking

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
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

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
  } catch (error) {
    console.error('Error in POST /api/date/record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
