import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { admin_wallet, x_tasks, launch } = await request.json();
    const { id } = await params;

    const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!admin_wallet || admin_wallet.toLowerCase() !== ADMIN_WALLET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();

    if (!Array.isArray(x_tasks)) {
      return NextResponse.json({ error: 'x_tasks must be an array' }, { status: 400 });
    }

    const updateData: Record<string, any> = { x_tasks };
    if (launch) {
      updateData.is_ready = true;
      updateData.status = 'active';
    }

    const { data, error } = await supabase
      .from('raffle_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, campaign: data });
  } catch (error) {
    console.error('Configure campaign error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
