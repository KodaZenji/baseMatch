export async function adminRaffle(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action, admin_wallet, campaign_data } = await request.json();
    const { id } = params;

    // Admin auth check
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
      // Fetch the application
      const { data: app, error: appError } = await supabase
        .from('raffle_partner_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError || !app) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      // Mark application approved
      await supabase
        .from('raffle_partner_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin_wallet.toLowerCase(),
        })
        .eq('id', id);

      // Create campaign — admin can override dates/details via campaign_data
      const { data: campaign, error: campaignError } = await supabase
        .from('raffle_campaigns')
        .insert({
          application_id: app.id,
          project_name: campaign_data?.project_name || app.project_name,
          project_description: campaign_data?.project_description || app.project_description,
          prize_description: campaign_data?.prize_description || app.prize_description,
          prize_quantity: campaign_data?.prize_quantity || app.prize_quantity,
          banner_url: campaign_data?.banner_url || null,
          discord_guild_id: app.discord_guild_id,
          discord_guild_name: campaign_data?.discord_guild_name || app.project_name,
          discord_guild_invite: campaign_data?.discord_guild_invite || app.discord_server_url,
          required_role_id: app.required_role_id,
          required_role_name: app.required_role_name,
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
