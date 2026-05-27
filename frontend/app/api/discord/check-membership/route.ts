// app/api/discord/check-membership/route.ts
// EDITED: now checks partner campaign's specific guild + role, not hardcoded BaseMatch guild

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(request: Request) {
  try {
    const { discord_user_id, guild_id, required_role_id } = await request.json();

    if (!discord_user_id || !guild_id || !required_role_id) {
      return NextResponse.json(
        { error: 'discord_user_id, guild_id, and required_role_id are required' },
        { status: 400 }
      );
    }

    if (!DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN not configured');
      return NextResponse.json({ inServer: false, hasRole: false });
    }

    // Check if user is in the partner's Discord server
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guild_id}/members/${discord_user_id}`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!memberResponse.ok) {
      // 404 = user not in server, 403 = bot not in server
      const status = memberResponse.status;
      if (status === 403) {
        console.error(`Bot is not in guild ${guild_id} — partner needs to invite the bot`);
        return NextResponse.json({
          inServer: false,
          hasRole: false,
          error: 'bot_not_in_server',
        });
      }
      return NextResponse.json({ inServer: false, hasRole: false });
    }

    const member = await memberResponse.json();
    const hasRole = member.roles.includes(required_role_id);

    return NextResponse.json({
      inServer: true,
      hasRole,
      username: member.user?.username,
      roles: member.roles,   // full role snapshot for storage
    });

  } catch (error) {
    console.error('Check membership error:', error);
    return NextResponse.json({ inServer: false, hasRole: false });
  }
}
