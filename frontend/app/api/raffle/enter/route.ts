// app/api/raffle/enter/route.ts
// POST — verify Discord role + record raffle entry
// Called after Discord OAuth callback lands user back on campaign page

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const {
      campaign_id,
      wallet_address,
      discord_user_id,
      discord_username,
    } = await request.json();

    if (!campaign_id || !wallet_address || !discord_user_id || !discord_username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const normalizedWallet = wallet_address.toLowerCase();

    // ── 1. Fetch campaign ───────────────────────────────────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('raffle_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'This campaign is no longer active' }, { status: 400 });
    }

    if (new Date(campaign.end_date) < new Date()) {
      return NextResponse.json({ error: 'This campaign has ended' }, { status: 400 });
    }

    // ── 2. Check for duplicate entry ────────────────────────────────────────
    const { data: existingEntry } = await supabase
      .from('raffle_entries')
      .select('id, entry_number')
      .eq('campaign_id', campaign_id)
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json({
        error: 'already_entered',
        entry_number: existingEntry.entry_number,
      }, { status: 409 });
    }

    // ── 3. Verify Discord role via check-membership ─────────────────────────
    const memberCheck = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/check-membership`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_user_id,
          guild_id: campaign.discord_guild_id,
          required_role_id: campaign.required_role_id,
        }),
      }
    );

    const memberData = await memberCheck.json();

    if (memberData.error === 'bot_not_in_server') {
      return NextResponse.json({
        error: 'Configuration error — please contact the campaign organizer.',
      }, { status: 500 });
    }

    if (!memberData.inServer) {
      return NextResponse.json({
        error: `You must be a member of the ${campaign.discord_guild_name} Discord server to enter.`,
        discord_invite: campaign.discord_guild_invite,
      }, { status: 403 });
    }

    if (!memberData.hasRole) {
      return NextResponse.json({
        error: `You need the "${campaign.required_role_name}" role in ${campaign.discord_guild_name} to enter this raffle.`,
        discord_invite: campaign.discord_guild_invite,
      }, { status: 403 });
    }

    // ── 4. Record entry ─────────────────────────────────────────────────────
    const { data: entry, error: entryError } = await supabase
      .from('raffle_entries')
      .insert({
        campaign_id,
        wallet_address: normalizedWallet,
        discord_user_id,
        discord_username,
        discord_roles: memberData.roles || [],
        role_verified: true,
      })
      .select()
      .single();

    if (entryError) {
      // Handle unique constraint violation on discord_user_id
      if (entryError.code === '23505') {
        return NextResponse.json({
          error: 'This Discord account has already entered this raffle.',
        }, { status: 409 });
      }
      throw entryError;
    }

    return NextResponse.json({
      success: true,
      entry_number: entry.entry_number,
      message: `You're in! Entry #${entry.entry_number}`,
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/raffle/enter error:', error);
    return NextResponse.json({ error: 'Failed to record entry' }, { status: 500 });
  }
}
