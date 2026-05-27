// ─────────────────────────────────────────────────────────────────────────────
// app/api/raffle/campaigns/route.ts
// GET active campaigns
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('raffle_campaigns')
      .select('*')
      .in('status', ['active', 'ended', 'drawn'])
      .order('end_date', { ascending: true });

    if (error) throw error;

    // Mark expired campaigns as ended
    const updated = data?.map(c => ({
      ...c,
      status: c.status === 'active' && new Date(c.end_date) < new Date() ? 'ended' : c.status,
    }));

    return NextResponse.json({ campaigns: updated || [] });
  } catch (error) {
    console.error('GET /api/raffle/campaigns error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
