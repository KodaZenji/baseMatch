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

interface RaffleRole {
  role_id: string | null;
  role_name: string;
  weight: number;
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

    const requiredRoles: RaffleRole[] = campaign.required_roles || [];

    if (requiredRoles.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no required roles configured' },
        { status: 500 }
      );
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

    // ── 3. Verify Discord server membership + fetch all user roles ──────────
    // Pass the first role_id for compat with check-membership's hasRole check.
    // What matters here is inServer + the full roles array for weight resolution.
    const memberCheck = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/check-membership`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_user_id,
          guild_id: campaign.discord_guild_id,
          required_role_id: requiredRoles[0]?.role_id ?? null,
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

    // ── 4. Weight resolution — find the highest matching role ───────────────
    // memberData.roles is the full array of role IDs the user holds in the server.
    const userRoleIds: string[] = memberData.roles || [];
    let matchedWeight = 0;
    let matchedRoleName: string | null = null;

    for (const role of requiredRoles) {
      if (role.role_id && userRoleIds.includes(role.role_id)) {
        if (role.weight > matchedWeight) {
          matchedWeight = role.weight;
          matchedRoleName = role.role_name;
        }
      }
    }

    if (matchedWeight === 0) {
      const roleNames = requiredRoles.map(r => `"${r.role_name}"`).join(', ');
      return NextResponse.json({
        error: `You need one of these roles in ${campaign.discord_guild_name}: ${roleNames}`,
        discord_invite: campaign.discord_guild_invite,
      }, { status: 403 });
    }

    // ── 5. Record entry ─────────────────────────────────────────────────────
    const { data: entry, error: entryError } = await supabase
      .from('raffle_entries')
      .insert({
        campaign_id,
        wallet_address: normalizedWallet,
        discord_user_id,
        discord_username,
        discord_roles: userRoleIds,          // snapshot of all role IDs at entry time
        role_verified: true,
        matched_role_weight: matchedWeight,  // used by draw route for weighted selection
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
      message: `You're in! Entry #${entry.entry_number}${matchedWeight > 1 ? ` · ${matchedWeight}× chance (${matchedRoleName})` : ''}`,
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/raffle/enter error:', error);
    return NextResponse.json({ error: 'Failed to record entry' }, { status: 500 });
  }
}
