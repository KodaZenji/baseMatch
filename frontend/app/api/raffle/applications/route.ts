import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const adminWallet = request.headers.get('x-admin-wallet')?.toLowerCase();
    const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();

    if (!adminWallet || adminWallet !== ADMIN_WALLET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('raffle_partner_applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ applications: data || [] });
  } catch (error) {
    console.error('GET /api/raffle/applications error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
