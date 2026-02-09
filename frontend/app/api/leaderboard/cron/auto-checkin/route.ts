import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

function getCheckInWindow(): 'morning' | 'night' | null {
  const hour = new Date().getUTCHours();
  if (hour >= 6 && hour < 18) return 'morning';
  if (hour >= 18 || hour < 6) return 'night';
  return null;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const now = new Date();
  const window = getCheckInWindow();
  
  if (!window) {
    return NextResponse.json({ error: 'Invalid window' }, { status: 400 });
  }
  
  try {
    // Get all users with active auto-check
    const { data: participants, error } = await supabaseClient
      .from('leaderboard_participants')
      .select('*')
      .eq('auto_check_enabled', true)
      .gt('auto_check_expiry', now.toISOString());
    
    if (error) {
      console.error('Error fetching participants:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    let checkedInCount = 0;
    
    for (const participant of participants || []) {
      // Check if already checked in this window
      if (participant.last_check_in_window === window) {
        continue; // already checked in this window
      }
      
      // Must be at least 12 hours since last check-in
      if (participant.last_check_in) {
        const hoursSince = (now.getTime() - new Date(participant.last_check_in).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12) continue;
      }
      
      // Calculate points
      const points = 10 + Math.min(participant.invite_count, 10) ** 2;
      
      // Get check-in number
      const { count } = await supabaseClient
        .from('leaderboard_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('participant_id', participant.id);
      
      const checkInNumber = (count || 0) + 1;
      
      // Create check-in
      await supabaseClient
        .from('leaderboard_checkins')
        .insert({
          participant_id: participant.id,
          window,
          points,
          auto_generated: true,
          invite_count_at_checkin: participant.invite_count,
          check_in_number: checkInNumber
        });
      
      // Update participant
      await supabaseClient
        .from('leaderboard_participants')
        .update({
          total_points: participant.total_points + points,
          last_check_in: now.toISOString(),
          last_check_in_window: window,
          check_in_streak: participant.check_in_streak + 1
        })
        .eq('id', participant.id);
      
      checkedInCount++;
    }
    
    return NextResponse.json({
      success: true,
      checkedIn: checkedInCount,
      window,
      timestamp: now.toISOString()
    });
    
  } catch (error: any) {
    console.error('Auto-checkin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
