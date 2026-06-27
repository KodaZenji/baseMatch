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
    const body = await request.json();
    const {
      project_name, project_description, contact_name, contact_discord,
      contact_email, website_url, twitter_url, partner_logo_url,
      discord_server_url, discord_guild_id,
      required_roles, prize_description, prize_quantity,
      proposed_start_date, proposed_end_date,
    } = body;

    // ── Basic field validation — matches frontend's required[] exactly ──
    // discord_guild_id is intentionally NOT required: bot supplies it after approval.
    const required = [
      project_name, project_description, contact_name, contact_discord,
      contact_email, discord_server_url, prize_description,
    ];
    if (required.some((f) => !f?.trim?.())) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    // ── Partner logo is required, validated separately (matches frontend) ──
    if (!partner_logo_url?.trim()) {
      return NextResponse.json({ error: 'Please provide a partner logo URL.' }, { status: 400 });
    }

    // ── Required roles array validation ──
    // Frontend sends required_roles: [{ role_id, role_name, weight }]
    if (!Array.isArray(required_roles) || required_roles.length === 0) {
      return NextResponse.json({ error: 'Please add at least one required role with a name.' }, { status: 400 });
    }

    const cleanRoles: RaffleRole[] = required_roles
      .filter((r: any) => typeof r?.role_name === 'string' && r.role_name.trim())
      .map((r: any) => ({
        role_id: typeof r.role_id === 'string' && r.role_id.trim() ? r.role_id.trim() : null,
        role_name: r.role_name.trim(),
        weight: Math.max(1, Number(r.weight) || 1),
      }));

    if (cleanRoles.length === 0) {
      return NextResponse.json({ error: 'Please add at least one required role with a name.' }, { status: 400 });
    }
    if (cleanRoles.some((r) => r.weight < 1)) {
      return NextResponse.json({ error: 'All role weights must be at least 1.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('raffle_partner_applications')
      .insert({
        project_name: project_name.trim(),
        project_description: project_description.trim(),
        partner_logo_url: partner_logo_url.trim(),
        contact_name: contact_name.trim(),
        contact_discord: contact_discord.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        website_url: website_url?.trim() || null,
        twitter_url: twitter_url?.trim() || null,
        x_handle: body.x_handle?.trim() || null,
        discord_server_url: discord_server_url.trim(),
        discord_guild_id: discord_guild_id?.trim() || null,
        required_roles: cleanRoles,              // stored as JSONB — see migration note below
        prize_description: prize_description.trim(),
        prize_quantity: parseInt(prize_quantity) || 1,
        proposed_start_date: proposed_start_date || null,
        proposed_end_date: proposed_end_date || null,
        status: 'pending',
      });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/raffle/apply error:', error);
    return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
  }
}
