// app/api/discord/generate-state/route.ts
// EDITED: no longer requires (or accepts) a wallet address. Discord connect
// now happens BEFORE wallet connect, so at this point we only know campaignId.

import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/discord-security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    // Payload is just the campaignId — wallet is attached later, after the
    // user has seen their Discord eligibility and chosen to connect.
    const state = generateStateToken(campaignId);

    return NextResponse.json({ state, expiresIn: 900 });

  } catch (error) {
    console.error('Error generating state token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
