import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (error) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ profile: null });
  }
}
