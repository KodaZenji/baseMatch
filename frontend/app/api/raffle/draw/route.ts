import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, drawn_by } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
    }

    const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!drawn_by || drawn_by.toLowerCase() !== ADMIN_WALLET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();

    const { data: campaign, error: campaignError } = await supabase
      .from('raffle_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'drawn') {
      return NextResponse.json({ error: 'Winners already drawn for this campaign' }, { status: 400 });
    }

    const { data: entries, error: entriesError } = await supabase
      .from('raffle_entries')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('role_verified', true);

    if (entriesError || !entries?.length) {
      return NextResponse.json({ error: 'No eligible entries found' }, { status: 400 });
    }

    const prizeCount = Math.min(campaign.prize_quantity, entries.length);

    // Build weighted pool — each entry appears matched_role_weight times
    // weight=1 (base) means 1 slot; weight=3 means 3 slots (3x chance)
    type Entry = typeof entries[0];
    const pool: Entry[] = [];
    for (const entry of entries) {
      const weight = Math.max(1, entry.matched_role_weight || 1);
      for (let w = 0; w < weight; w++) {
        pool.push(entry);
      }
    }

    // Fisher-Yates shuffle the weighted pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Pick unique winners (de-duplicate by entry id)
    const seen = new Set<string>();
    const winners: Entry[] = [];
    for (const entry of pool) {
      if (!seen.has(entry.id) && winners.length < prizeCount) {
        seen.add(entry.id);
        winners.push(entry);
      }
    }

    const winnerInserts = winners.map((entry, idx) => ({
      campaign_id,
      entry_id: entry.id,
      wallet_address: entry.wallet_address,
      discord_user_id: entry.discord_user_id,
      discord_username: entry.discord_username,
      prize_position: idx + 1,
      draw_method: 'weighted',
      drawn_by: drawn_by.toLowerCase(),
    }));

    const { error: winnersError } = await supabase
      .from('raffle_winners')
      .insert(winnerInserts);

    if (winnersError) throw winnersError;

    await supabase
      .from('raffle_campaigns')
      .update({ status: 'drawn', winners_drawn_at: new Date().toISOString() })
      .eq('id', campaign_id);

    return NextResponse.json({
      success: true,
      winners: winnerInserts,
      total_entries: entries.length,
      weighted_pool_size: pool.length,
      winners_drawn: prizeCount,
    });

  } catch (error) {
    console.error('Draw raffle error:', error);
    return NextResponse.json({ error: 'Draw failed' }, { status: 500 });
  }
}
