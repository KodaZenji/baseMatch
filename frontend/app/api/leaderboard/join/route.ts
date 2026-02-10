import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { walletAddress, referralCode } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // 1️⃣ Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        wallet_address,
        name,
        gender,
        photoUrl,
        farcaster_username,
        farcaster_verified,
        discord_verified
      `)
      .eq('wallet_address', walletAddress)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found. Please create a profile first.',
        needsProfile: true 
      }, { status: 404 });
    }

    // 2️⃣ Check if user already joined leaderboard
    const { data: existing } = await supabaseClient
      .from('leaderboard_participants')
      .select('*, profiles!inner(*)')
      .eq('profile_id', profile.id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        participant: existing,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${existing.referral_code}`
      });
    }

    // 3️⃣ Generate new referral code
    const { data: codeData } = await supabaseClient.rpc('lb_generate_referral_code');
    const newReferralCode = codeData;

    // 4️⃣ Lookup referrer if referralCode exists
    let referrerId: string | null = null;
    if (referralCode) {
      const { data: referrer } = await supabaseClient
        .from('leaderboard_participants')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // 5️⃣ Insert participant with proper referred_by_id
    const { data: participant, error: createError } = await supabaseClient
      .from('leaderboard_participants')
      .insert({
        profile_id: profile.id,
        wallet_address: walletAddress,
        referral_code: newReferralCode,
        referred_by: referrerId
      })
      .select()
      .single();

    if (createError || !participant) {
      console.error('Create participant error:', createError);
      return NextResponse.json({ error: createError?.message || 'Unknown error' }, { status: 500 });
    }

    // 6️⃣ If referred, create invite relationship + increment invite_count
    if (referrerId) {
      await supabaseClient.from('leaderboard_invites').insert({
        inviter_id: referrerId,
        invitee_id: participant.id
      });

      // ✅ Use RPC to safely increment
      await supabaseClient.rpc('increment_invite_count', { participant_id: referrerId });

      // Log invite activity
      await supabaseClient.from('leaderboard_activity_log').insert({
        participant_id: referrerId,
        action_type: 'invite',
        action_data: { invitee_wallet: walletAddress }
      });
    }

    // 7️⃣ Log join activity
    await supabaseClient.from('leaderboard_activity_log').insert({
      participant_id: participant.id,
      action_type: 'join',
      action_data: { 
        referred_by: referralCode,
        profile_name: profile.name
      }
    });

    // 8️⃣ Return response
    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      participant,
      profile,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${newReferralCode}`,
      needsInvite: true // must invite 1 person to unlock check-ins
    });

  } catch (error: any) {
    console.error('Join leaderboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
