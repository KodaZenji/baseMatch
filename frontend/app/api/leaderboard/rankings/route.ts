import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gender = searchParams.get('gender'); 
  const limit = parseInt(searchParams.get('limit') || '200');
  const myWallet = searchParams.get('myWallet');
  
  console.log('=== RANKINGS REQUEST ===');
  console.log('Gender filter:', gender);
  console.log('My Wallet:', myWallet);
  
  try {
    // Use the leaderboard_rankings view
    let query = supabaseService
      .from('leaderboard_rankings')
      .select('*')
      .eq('is_eligible', true);
    
    // FIX: Case-insensitive gender matching
    if (gender) {
      const genderTitleCase = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      query = query.ilike('gender', genderTitleCase);
      console.log('Filtering by gender:', genderTitleCase);
    }
    
    const { data: rankings, error } = await query
      .order('rank_in_gender', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('❌ Rankings error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ Found rankings:', rankings?.length || 0);
    
    // Debug: Show first few entries
    if (rankings && rankings.length > 0) {
      console.log('Sample entry:', {
        wallet: rankings[0].wallet_address,
        gender: rankings[0].gender,
        points: rankings[0].total_points,
        rank: rankings[0].rank_in_gender
      });
    }
    
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
    
    // Get total competitors using the SAME view with SAME filters
    let countQuery = supabaseService
      .from('leaderboard_rankings')
      .select('*', { count: 'exact', head: true })
      .eq('is_eligible', true);
    
    // Apply same gender filter for count
    if (gender) {
      countQuery = countQuery.eq('gender', gender);
    }
    
    const { count: totalCompetitors, error: countError } = await countQuery;
    
    if (countError) {
      console.error('❌ Count query error:', countError);
    }
    
    console.log('Total competitors:', totalCompetitors);
    console.log('===================\n');
    
    return NextResponse.json({
      leaderboard: rankings || [],
      totalCompetitors: totalCompetitors || 0,
      myRank,
      cutoffPoints: rankings?.[99]?.total_points || 0
    });
    
    
  } catch (error: any) {
    console.error('💥 Rankings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
