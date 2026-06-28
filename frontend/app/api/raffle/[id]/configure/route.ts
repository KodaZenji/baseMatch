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
      // ── REAL GATE — this is the actual security boundary, not the frontend
      // disabled-button styling. Re-verify the bot is live in the guild
      // right now, not just trust whatever bot_connected says from approval
      // time — the bot could have been kicked since then.
      const { data: campaign, error: fetchError } = await supabase
        .from('raffle_campaigns')
        .select('discord_guild_id, status')
        .eq('id', id)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      if (!campaign.discord_guild_id) {
        return NextResponse.json(
          { error: 'Cannot launch — no Discord server connected yet. Partner must invite the bot first.' },
          { status: 400 }
        );
      }

      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 500 });
      }

      const guildCheck = await fetch(
        `https://discord.com/api/v10/guilds/${campaign.discord_guild_id}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );

      if (!guildCheck.ok) {
        // Bot was connected before but isn't now — keep the record honest.
        await supabase
          .from('raffle_campaigns')
          .update({ bot_connected: false })
          .eq('id', id);

        return NextResponse.json(
          { error: 'Bot is not currently in this Discord server. Cannot launch until the partner re-invites it.' },
          { status: 400 }
        );
      }

      updateData.is_ready = true;
      updateData.status = 'active';
      updateData.bot_connected = true; // confirmed live, right now
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
