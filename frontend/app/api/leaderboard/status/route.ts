import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet')?.toLowerCase();
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
  }
  
  try {
    const { data: participant } = await supabaseService
      .from('leaderboard_participants')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    
    if (!participant) {
      return NextResponse.json({ joined: false });
    }
    
    return NextResponse.json({
      joined: true,
      participant
    });
    
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
