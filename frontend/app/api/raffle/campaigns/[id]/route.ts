import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Promise wrapper
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;  // ← await here

    
const { data: campaign, error } = await supabase
  .from('raffle_campaigns')
  .select('*, x_tasks') 
  .eq('id', id)
  .single();
    
    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let winners = [];
    if (campaign.status === 'drawn') {
      const { data: w } = await supabase
        .from('raffle_winners')
        .select('*')
        .eq('campaign_id', id)
        .order('prize_position', { ascending: true });
      winners = w || [];
    }

    return NextResponse.json({ campaign, winners });
  } catch (error) {
    console.error('GET /api/raffle/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}
