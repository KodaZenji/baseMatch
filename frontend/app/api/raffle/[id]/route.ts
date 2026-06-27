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

interface DiscordGuildRole {
  id: string;
  name: string;
}

// ── Resolve missing role_id values by name, via Discord's bot API ──────────
// Discord roles are matched by exact name (case-insensitive) since the apply
// form only ever collects a display name when role_id is left blank.
async function resolveRoleIds(
  guildId: string,
  roles: RaffleRole[]
): Promise<{ resolved: RaffleRole[]; unresolved: string[] }> {
  const needsLookup = roles.some((r) => !r.role_id);
  if (!needsLookup) {
    return { resolved: roles, unresolved: [] };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    // No bot token configured — can't resolve anything; surface all blanks as unresolved.
    return {
      resolved: roles,
      unresolved: roles.filter((r) => !r.role_id).map((r) => r.role_name),
    };
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    // Bot not in server, missing permissions, or bad guild ID — can't resolve.
    return {
      resolved: roles,
      unresolved: roles.filter((r) => !r.role_id).map((r) => r.role_name),
    };
  }

  const guildRoles: DiscordGuildRole[] = await res.json();
  const unresolved: string[] = [];

  const resolved = roles.map((role) => {
    if (role.role_id) return role; // already has an ID — leave as-is

    const match = guildRoles.find(
      (gr) => gr.name.trim().toLowerCase() === role.role_name.trim().toLowerCase()
    );

    if (!match) {
      unresolved.push(role.role_name);
      return role; // still null — caller decides whether to block approval
    }

    return { ...role, role_id: match.id };
  });

  return { resolved, unresolved };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action, admin_wallet, campaign_data } = await request.json();
    const { id } = await params;

    const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    if (!admin_wallet || admin_wallet.toLowerCase() !== ADMIN_WALLET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabase();

    if (action === 'decline') {
      await supabase
        .from('raffle_partner_applications')
        .update({
          status: 'declined',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin_wallet.toLowerCase(),
          admin_notes: campaign_data?.notes || null,
        })
        .eq('id', id);

      return NextResponse.json({ success: true, status: 'declined' });
    }

    if (action === 'approve') {
      const { data: app, error: appError } = await supabase
        .from('raffle_partner_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError || !app) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      // Validate required_roles from application
      const requiredRoles: RaffleRole[] = app.required_roles;
      if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
        return NextResponse.json(
          { error: 'Application has no required_roles. Cannot approve.' },
          { status: 400 }
        );
      }

      // ── NEW: resolve any role_id left blank on the apply form ──────────
      // Without this, roles with role_id === null can never match a user
      // in /api/raffle/enter, silently locking everyone out of the raffle.
      const guildIdForLookup = campaign_data?.discord_guild_id || app.discord_guild_id;

      if (!guildIdForLookup) {
        return NextResponse.json(
          {
            error:
              'No Discord guild ID on file. Add one in campaign_data.discord_guild_id before approving — required to resolve role names to IDs.',
          },
          { status: 400 }
        );
      }

      const { resolved: resolvedRoles, unresolved } = await resolveRoleIds(
        guildIdForLookup,
        campaign_data?.required_roles || requiredRoles
      );

      if (unresolved.length > 0) {
        return NextResponse.json(
          {
            error: `Could not resolve role ID for: ${unresolved.join(', ')}. Confirm the bot is in the server with permission to view roles, and that the role name matches exactly.`,
          },
          { status: 400 }
        );
      }

      await supabase
        .from('raffle_partner_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin_wallet.toLowerCase(),
        })
        .eq('id', id);

      const { data: campaign, error: campaignError } = await supabase
        .from('raffle_campaigns')
        .insert({
          application_id: app.id,
          project_name: campaign_data?.project_name || app.project_name,
          project_description: campaign_data?.project_description || app.project_description,
          prize_description: campaign_data?.prize_description || app.prize_description,
          prize_quantity: campaign_data?.prize_quantity || app.prize_quantity,

          // partner_logo_url comes from the application
          partner_logo_url: app.partner_logo_url || null,

          // banner_url is your admin-controlled default image — never from the partner
          banner_url: campaign_data?.banner_url || process.env.DEFAULT_RAFFLE_BANNER_URL || null,

          // required_roles now has every role_id resolved — safe for /api/raffle/enter
          required_roles: resolvedRoles,

          discord_guild_id: guildIdForLookup,
          discord_guild_name: campaign_data?.discord_guild_name || app.project_name,
          discord_guild_invite: campaign_data?.discord_guild_invite || app.discord_server_url,
          twitter_url: app.twitter_url || null,
          website_url: app.website_url || null,
          start_date: campaign_data?.start_date || app.proposed_start_date || new Date().toISOString(),
          end_date: campaign_data?.end_date || app.proposed_end_date,
          status: 'active',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      return NextResponse.json({ success: true, status: 'approved', campaign });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin raffle error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
