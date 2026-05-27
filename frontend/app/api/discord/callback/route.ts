// app/api/discord/callback/route.ts
// EDITED: after OAuth success, redirects to raffle entry instead of verify/OG role
// Stores discord identity in session, then redirects back to campaign page

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

    // Verify state token — now payload may be "address::campaignId"
    const statePayload = verifyStateToken(state);
    if (!statePayload) {
      console.error('🚨 SECURITY: Invalid or tampered state token');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=invalid_token`);
    }

    if (isNonceUsed(state)) {
      console.error('🚨 SECURITY: Replay attack detected');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=token_already_used`);
    }

    markNonceAsUsed(state);

    // Parse wallet + optional campaignId from state payload
    const [walletAddress, campaignId] = statePayload.split('::');

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

    // Get user's guild memberships to snapshot roles
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guilds = guildsResponse.ok ? await guildsResponse.json() : [];

    // Build redirect — pass discord identity back to campaign page via query params
    // The campaign page calls /api/raffle/enter with this data + verifies role server-side
    const redirectBase = campaignId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/raffle/${campaignId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/raffle`;

    const params = new URLSearchParams({
      discord_success: 'true',
      discord_user_id: discordUser.id,
      discord_username: `${discordUser.username}`,
      wallet: walletAddress,
      ...(campaignId && { campaign_id: campaignId }),
    });

    return NextResponse.redirect(`${redirectBase}?${params.toString()}`);

  } catch (error) {
    console.error('Discord callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/raffle?discord_error=callback_failed`);
  }
}
