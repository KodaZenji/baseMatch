import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=missing_params`
      );
    }

    
    const walletAddress = verifyStateToken(state);
    
    if (!walletAddress) {
      console.error('🚨 SECURITY: Invalid or tampered state token detected');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=invalid_token`
      );
    }

  
    if (isNonceUsed(state)) {
      console.error('🚨 SECURITY: Replay attack detected - token already used');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=token_already_used`
      );
    }

    // Mark token as used immediately
    markNonceAsUsed(state);

    console.log('✅ State token verified for wallet:', walletAddress);

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Discord token exchange failed:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=user_fetch_failed`
      );
    }

    const discordUser = await userResponse.json();
    const discordUserId = discordUser.id;

    // Add user to guild (if not already a member)
    if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID) {
      try {
        await fetch(
          `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: accessToken,
            }),
          }
        );
      } catch (error) {
        console.error('Error adding user to guild:', error);
      }
    }

    // Call verification endpoint with cryptographically verified wallet
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true',
        },
        body: JSON.stringify({
          walletAddress,
          discordUserId,
          token: accessToken,
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (verifyData.success) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_success=true&role=${encodeURIComponent(verifyData.role || 'Early OG')}`
      );
    } else if (verifyData.alreadyVerified) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_info=already_verified`
      );
    } else if (verifyData.revoked) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=role_revoked_sybil`
      );
    } else {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=${encodeURIComponent(verifyData.error || 'verification_failed')}`
      );
    }

  } catch (error) {
    console.error('Discord callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?discord_error=callback_failed`
    );
  }
}
