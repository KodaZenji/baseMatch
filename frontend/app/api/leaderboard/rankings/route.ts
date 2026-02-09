import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gender = searchParams.get('gender'); 
  const limit = parseInt(searchParams.get('limit') || '200');
  const myWallet = searchParams.get('myWallet');
  
  try {
    // Use the leaderboard_rankings view
    let query = supabaseClient
      .from('leaderboard_rankings')
      .select('*')
      .eq('is_eligible', true);
    
    if (gender) {
      query = query.eq('gender', gender);
    }
    
    const { data: rankings, error } = await query
      .order('rank_in_gender', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('Rankings error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Find user's rank if wallet provided
    let myRank = null;
    if (myWallet) {
      myRank = rankings?.find(
        r => r.wallet_address.toLowerCase() === myWallet.toLowerCase()
      );
    }
    
    // Get total competitors
    const { count: totalCompetitors } = await supabaseClient
      .from('leaderboard_participants')
      .select('*, profiles!inner(*)', { count: 'exact', head: true })
      .eq('is_eligible', true)
      .eq(gender ? 'profiles.gender' : 'is_eligible', gender || true);
    
    return NextResponse.json({
      leaderboard: rankings || [],
      totalCompetitors: totalCompetitors || 0,
      myRank,
      cutoffPoints: rankings?.[99]?.total_points || 0 // rank 100's points
    });
    
  } catch (error: any) {
    console.error('Rankings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
