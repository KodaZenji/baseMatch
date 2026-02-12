import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gender = searchParams.get('gender'); 
  const limit = parseInt(searchParams.get('limit') || '200');
  const myWallet = searchParams.get('myWallet');
  
  console.log('=== RANKINGS REQUEST ===');
  console.log('Gender:', gender);
  console.log('My Wallet:', myWallet);
  
  try {
    // Use the leaderboard_rankings view
    let query = supabaseService
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
      console.error('❌ Rankings error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Found rankings:', rankings?.length || 0);
    
    // Find user's rank if wallet provided
    let myRank = null;
    if (myWallet) {
      const normalizedWallet = myWallet.toLowerCase().trim();
      myRank = rankings?.find(
        r => r.wallet_address?.toLowerCase().trim() === normalizedWallet
      );
      console.log('Looking for wallet:', normalizedWallet);
      console.log('My rank found:', !!myRank);
      if (myRank) {
        console.log('My rank data:', {
          rank: myRank.rank_in_gender,
          points: myRank.total_points,
          wallet: myRank.wallet_address
        });
      }
    }
    
    // Get total competitors
    const { count: totalCompetitors } = await supabaseService
      .from('leaderboard_participants')
      .select('*, profiles!inner(*)', { count: 'exact', head: true })
      .eq('is_eligible', true)
      .eq(gender ? 'profiles.gender' : 'is_eligible', gender || true);
    
    console.log('Total competitors:', totalCompetitors);
    console.log('===================\n');
    
    return NextResponse.json({
      leaderboard: rankings || [],
      totalCompetitors: totalCompetitors || 0,
      myRank,
      cutoffPoints: rankings?.[99]?.total_points || 0 // rank 100's points
    });
    
  } catch (error: any) {
    console.error('💥 Rankings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
