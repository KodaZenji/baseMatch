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
    return {
      resolved: roles,
      unresolved: roles.filter((r) => !r.role_id).map((r) => r.role_name),
    };
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    return {
      resolved: roles,
      unresolved: roles.filter((r) => !r.role_id).map((r) => r.role_name),
    };
  }

  const guildRoles: DiscordGuildRole[] = await res.json();
  const unresolved: string[] = [];

  const resolved = roles.map((role) => {
    if (role.role_id) return role;
    const match = guildRoles.find(
      (gr) => gr.name.trim().toLowerCase() === role.role_name.trim().toLowerCase()
    );
    if (!match) {
      unresolved.push(role.role_name);
      return role;
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

      const requiredRoles: RaffleRole[] = app.required_roles;
      if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
        return NextResponse.json(
          { error: 'Application has no required_roles. Cannot approve.' },
          { status: 400 }
        );
      }

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

      // ── CAMPAIGN CREATED FIRST ───────────────────────────────────────────
      // If this insert fails (bad column, constraint violation, etc.) the
      // application status is never touched — it stays 'pending' and is
      // safely retryable. This is the fix for the orphaned-approval bug:
      // previously the application flipped to 'approved' BEFORE this insert,
      // so a failure here left a permanently "approved" application with no
      // matching campaign anywhere.
      const { data: campaign, error: campaignError } = await supabase
        .from('raffle_campaigns')
        .insert({
          application_id: app.id,
          project_name: campaign_data?.project_name || app.project_name,
          project_description: campaign_data?.project_description || app.project_description,
          prize_description: campaign_data?.prize_description || app.prize_description,
          prize_quantity: campaign_data?.prize_quantity || app.prize_quantity,
          partner_logo_url: app.partner_logo_url || null,
          banner_url: campaign_data?.banner_url || process.env.DEFAULT_RAFFLE_BANNER_URL || null,
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

      if (campaignError) {
        console.error('Campaign creation failed — application left as pending:', campaignError);
        return NextResponse.json(
          { error: 'Failed to create campaign. Application was not marked approved — safe to retry.' },
          { status: 500 }
        );
      }

      // ── ONLY now flip the application to approved ────────────────────────
      const { error: updateError } = await supabase
        .from('raffle_partner_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin_wallet.toLowerCase(),
        })
        .eq('id', id);

      if (updateError) {
        // Campaign exists but application status didn't update — log loudly,
        // but don't fail the request since the campaign is already live.
        console.error('Campaign created but application status update failed:', updateError);
      }

      return NextResponse.json({ success: true, status: 'approved', campaign });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin raffle error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
