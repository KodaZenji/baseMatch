// app/api/discord/generate-state/route.ts
// EDITED: removed profile-existence gate entirely — this is a partner collab raffle,
// open to anyone with a wallet, not limited to existing BaseMatch users.
// Used by raffle entry flow to initiate Discord OAuth.

import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/discord-security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, campaignId } = body;

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // No profile check — collab raffles are open to any wallet, registered or not.

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
