import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Discord redirects here right after the partner finishes adding the bot
// to their server. It appends `guild_id` to the query string automatically
// — no bot gateway process needed, no manual entry needed.
//
// GET /api/discord/bot-callback?guild_id=123456789&state=<application_id>
export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guild_id');
  const applicationId = request.nextUrl.searchParams.get('state');

  if (!guildId || !applicationId) {
    return NextResponse.redirect(
      new URL('/raffle/apply?bot_invite=missing_params', request.url)
    );
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('raffle_partner_applications')
    .update({ discord_guild_id: guildId })
    .eq('id', applicationId);

  if (error) {
    console.error('Failed to save guild_id from bot callback:', error);
    return NextResponse.redirect(
      new URL('/raffle/apply?bot_invite=save_failed', request.url)
    );
  }

  // Send the partner somewhere that confirms success — adjust to your actual page.
  return NextResponse.redirect(
    new URL('/raffle/apply?bot_invite=success', request.url)
  );
}
