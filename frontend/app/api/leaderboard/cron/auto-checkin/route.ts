import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server'; 

function getCheckInWindow(): 'morning' | 'night' | null {
  const hour = new Date().getUTCHours();
  if (hour >= 6 && hour < 18) return 'morning';
  if (hour >= 18 || hour < 6) return 'night';
  return null;
}

export async function GET(request: Request) {
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
    const { data: participants, error } = await supabaseService
      .from('leaderboard_participants')
      .select('id, wallet_address, invite_count, total_points, check_in_streak, last_check_in, last_check_in_window')
      .eq('auto_check_enabled', true)
      .gt('auto_check_expiry', now.toISOString())
      .neq('last_check_in_window', window);
    
    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!participants || participants.length === 0) {
      return NextResponse.json({
        success: true,
        checkedIn: 0,
        window,
        message: 'No participants to check in'
      });
    }
    
    const eligible = participants.filter(p => {
      if (!p.last_check_in) return true;
      const hoursSince = (now.getTime() - new Date(p.last_check_in).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 12;
    });
    
    const checkinsToInsert = [];
    const participantUpdates = [];
    
    for (const p of eligible) {
      const points = 10 + Math.min(p.invite_count || 0, 10) ** 2;
      
      const { count } = await supabaseService
        .from('leaderboard_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('participant_id', p.id);
      
      checkinsToInsert.push({
        participant_id: p.id,
        checkin_window: window,
        points,
        auto_generated: true,
        invite_count_at_checkin: p.invite_count || 0,
        check_in_number: (count || 0) + 1
      });
      
      participantUpdates.push({
        id: p.id,
        total_points: (p.total_points || 0) + points,
        last_check_in: now.toISOString(),
        last_check_in_window: window,
        check_in_streak: (p.check_in_streak || 0) + 1
      });
    }
    
    if (checkinsToInsert.length > 0) {
      await supabaseService
        .from('leaderboard_checkins')
        .insert(checkinsToInsert);
    }
    
    if (participantUpdates.length > 0) {
      await supabaseService
        .from('leaderboard_participants')
        .upsert(participantUpdates, { onConflict: 'id' });
    }
    
    return NextResponse.json({
      success: true,
      checkedIn: eligible.length,
      window,
      timestamp: now.toISOString(),
      totalWithAutoCheck: participants.length
    });
    
  } catch (error: any) {
    console.error('Auto-checkin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
