// app/api/discord/generate-state/route.ts
// EDITED: removed farcaster_verified gate — just checks profile exists
// Used by raffle entry flow to initiate Discord OAuth

import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/discord-security';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, campaignId } = body;

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Check profile exists — no longer requires farcaster_verified
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('wallet_address')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found. Please register first.' }, { status: 404 });
    }

    // Embed campaignId in state so callback knows which raffle to enter
    const statePayload = campaignId
      ? `${normalizedAddress}::${campaignId}`
      : normalizedAddress;

    const state = generateStateToken(statePayload);

    return NextResponse.json({ state, expiresIn: 900 });

  } catch (error) {
    console.error('Error generating state token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
