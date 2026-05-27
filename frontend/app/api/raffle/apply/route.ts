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
    const body = await request.json();
    const {
      project_name, project_description, contact_name, contact_discord,
      contact_email, website_url, twitter_url, discord_server_url,
      discord_guild_id, required_role_id, required_role_name,
      prize_description, prize_quantity, proposed_start_date, proposed_end_date,
    } = body;

    // Basic validation
    const required = [
      project_name, project_description, contact_name, contact_discord,
      contact_email, discord_server_url, discord_guild_id, required_role_id,
      required_role_name, prize_description,
    ];
    if (required.some(f => !f?.trim())) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('raffle_partner_applications')
      .insert({
        project_name: project_name.trim(),
        project_description: project_description.trim(),
        contact_name: contact_name.trim(),
        contact_discord: contact_discord.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        website_url: website_url?.trim() || null,
        twitter_url: twitter_url?.trim() || null,
        discord_server_url: discord_server_url.trim(),
        discord_guild_id: discord_guild_id.trim(),
        required_role_id: required_role_id.trim(),
        required_role_name: required_role_name.trim(),
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
