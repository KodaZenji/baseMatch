import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }
  
  try {
    // Get participant with profile data
    const { data: participant, error } = await supabaseClient
      .from('leaderboard_rankings')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error || !participant) {
      return NextResponse.json({
        joined: false,
        needsJoin: true
      });
    }
    
    // Get invite details
    const { data: invites } = await supabaseClient
      .from('leaderboard_invites')
      .select(`
        *,
        invitee:leaderboard_participants!leaderboard_invites_invitee_id_fkey(
          wallet_address,
          total_points,
          joined_at,
          profiles!inner(name, photoUrl)
        )
      `)
      .eq('inviter_id', participant.leaderboard_id)
      .order('created_at', { ascending: false });
    
    // Get recent check-ins
    const { data: recentCheckins } = await supabaseClient
      .from('leaderboard_checkins')
      .select('*')
      .eq('participant_id', participant.leaderboard_id)
      .order('timestamp', { ascending: false })
      .limit(7);
    
    return NextResponse.json({
      joined: true,
      participant,
      invites: invites || [],
      recentCheckins: recentCheckins || [],
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${participant.referral_code}`
    });
    
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
