// app/api/discord/callback/route.ts
// EDITED: Discord-first flow — state now carries only campaignId, no wallet.
// Wallet is connected AFTER this, back on the campaign page, once the user
// has seen their Discord eligibility. Also removed the unused guilds fetch
// — that endpoint can't return per-guild roles anyway; role checks happen
// server-side in /api/raffle/enter via the bot token.

import { NextResponse, NextRequest } from 'next/server';
import { verifyStateToken, isNonceUsed, markNonceAsUsed } from '@/lib/discord-security';

export const runtime = 'nodejs';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=missing_params`);
    }

    // Verify state token — payload is now just the campaignId
    const campaignId = verifyStateToken(state);
    if (!campaignId) {
      console.error('🚨 SECURITY: Invalid or tampered state token');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=invalid_token`);
    }

    if (isNonceUsed(state)) {
      console.error('🚨 SECURITY: Replay attack detected');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=token_already_used`);
    }

    markNonceAsUsed(state);

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Discord token exchange failed:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Discord user identity
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=user_fetch_failed`);
    }

    const discordUser = await userResponse.json();

    // Redirect back to the campaign page with Discord identity — NO wallet yet.
    // The campaign page will show eligibility status and prompt for wallet next.
    const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/raffle/${campaignId}`;

    const params = new URLSearchParams({
      discord_success: 'true',
      discord_user_id: discordUser.id,
      discord_username: discordUser.username,
    });

    return NextResponse.redirect(`${redirectBase}?${params.toString()}`);

  } catch (error) {
    console.error('Discord callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=callback_failed`);
  }
}
