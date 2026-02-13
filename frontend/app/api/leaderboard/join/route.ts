
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    const referralCode = body.referralCode?.trim()?.toUpperCase() || null;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address',
        code: 'INVALID_ADDRESS'
      }, { status: 400 });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, wallet_address, name, gender')
      .eq('wallet_address', walletAddress)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        needsProfile: true 
      }, { status: 404 });
    }

    // Check if already joined
    const { data: existing } = await supabaseService
      .from('leaderboard_participants')
      .select('*')
      .eq('profile_id', profile.id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        participant: existing,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${existing.referral_code}`
      });
    }

    // Generate code
    const { data: newReferralCode } = await supabaseService
      .rpc('lb_generate_referral_code');
    
    if (!newReferralCode) {
      return NextResponse.json({ 
        error: 'Failed to generate referral code'
      }, { status: 500 });
    }

    // Lookup referrer
    let referrerId: string | null = null;
    
    if (referralCode) {
      const { data: referrer } = await supabaseService
        .from('leaderboard_participants')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Insert participant
    const { data: participant, error: createError } = await supabaseService
      .from('leaderboard_participants')
      .insert({
        profile_id: profile.id,
        wallet_address: walletAddress,
        referral_code: newReferralCode,
        referred_by_id: referrerId,
        invite_count: 0,
        total_points: 0,
        check_in_streak: 0
      })
      .select()
      .single();

    if (createError || !participant) {
      return NextResponse.json({ 
        error: 'Failed to create participant'
      }, { status: 500 });
    }

    // Handle referral
    if (referrerId) {
      await supabaseService
        .from('leaderboard_invites')
        .insert({
          inviter_id: referrerId,
          invitee_id: participant.id
        });
      
      await supabaseService.rpc('increment_invite_count', { 
        participant_uuid: referrerId 
      });

      await supabaseService
        .from('leaderboard_activity_log')
        .insert({
          participant_id: referrerId,
          action_type: 'invite',
          action_data: { 
            invitee_id: participant.id,
            invitee_wallet: walletAddress
          }
        });
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      participant,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${newReferralCode}`,
      needsInvite: participant.invite_count < 1
    });

  } catch (error: any) {
    console.error('Join error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
