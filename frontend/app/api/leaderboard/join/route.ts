import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    const referralCode = body.referralCode?.trim();

    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      }, { status: 400 });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_ADDRESS_FORMAT'
      }, { status: 400 });
    }

    // 1️⃣ Get user's profile
    const { data: profile, error: profileError } = await supabaseService
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

    // 2️⃣ Check if user already joined
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

    // 3️⃣ Generate referral code
    const { data: codeData, error: codeError } = await supabaseService
      .rpc('lb_generate_referral_code');
    
    if (codeError || !codeData) {
      console.error('Referral code generation error:', codeError);
      return NextResponse.json({ 
        error: 'Failed to generate referral code',
        code: 'REFERRAL_CODE_ERROR'
      }, { status: 500 });
    }
    
    const newReferralCode = codeData;

    // 4️⃣ Lookup referrer
    let referrerId: string | null = null;
    
    if (referralCode) {
      const { data: referrer } = await supabaseService
        .from('leaderboard_participants')
        .select('id, referral_code, invite_count')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        referrerId = referrer.id;
        console.log(`User referred by code: ${referralCode}`);
      } else {
        console.warn(`Invalid referral code: ${referralCode}`);
      }
    }

    // 5️⃣ Insert participant
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
      console.error('Create participant error:', createError);
      return NextResponse.json({ 
        error: createError?.message || 'Failed to create participant',
        code: 'PARTICIPANT_CREATE_ERROR'
      }, { status: 500 });
    }

    // 6️⃣ Handle referral
    if (referrerId) {
      const { error: inviteError } = await supabaseService
        .from('leaderboard_invites')
        .insert({
          inviter_id: referrerId,
          invitee_id: participant.id
        });
      
      if (inviteError) {
        console.error('Invite record error:', inviteError);
      } else {
        await supabaseService.rpc('increment_invite_count', { 
          participant_uuid: referrerId 
        });
      }

      await supabaseService
        .from('leaderboard_activity_log')
        .insert({
          participant_id: referrerId,
          action_type: 'invite',
          action_data: { 
            invitee_id: participant.id,
            invitee_wallet: walletAddress,
            invitee_name: profile.name
          }
        });
    }

    // 7️⃣ Log join
    await supabaseService
      .from('leaderboard_activity_log')
      .insert({
        participant_id: participant.id,
        action_type: 'join',
        action_data: { 
          referred_by_code: referralCode || null,
          referred_by_id: referrerId || null,
          profile_name: profile.name,
          wallet_address: walletAddress
        }
      });

    // 8️⃣ Return
    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      participant: {
        ...participant,
        profile
      },
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${newReferralCode}`,
      needsInvite: participant.invite_count < 1,
      message: referrerId 
        ? 'Successfully joined! Invite 1 person to unlock check-ins.' 
        : 'Successfully joined! Share your referral link and invite 1 person to unlock check-ins.'
    });

  } catch (error: any) {
    console.error('Join leaderboard error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
