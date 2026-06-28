import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/raffle/[id]/recheck-bot
// Re-verifies the bot is still present in a campaign's Discord server.
// Call this on a cron (e.g. every few hours) or from an admin "Recheck" button —
// catches the case where a partner kicks the bot after launch, which nothing
// else currently detects.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: campaign, error } = await supabase
    .from('raffle_campaigns')
    .select('discord_guild_id')
    .eq('id', id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 500 });
  }

  // GET /guilds/{id} with the bot's own token only succeeds if the bot
  // is currently a member of that guild.
  const res = await fetch(`https://discord.com/api/v10/guilds/${campaign.discord_guild_id}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  const stillConnected = res.ok;

  await supabase
    .from('raffle_campaigns')
    .update({ bot_connected: stillConnected })
    .eq('id', id);

  return NextResponse.json({ bot_connected: stillConnected });
}
