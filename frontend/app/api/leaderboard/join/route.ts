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
    const { data: newReferralCode, error: codeError } = await supabaseService
      .rpc('lb_generate_referral_code');
    
    if (codeError || !newReferralCode) {
      return NextResponse.json({ 
        error: 'Failed to generate referral code'
      }, { status: 500 });
    }

    // ⚠️ CRITICAL: Lookup referrer BEFORE creating participant
    let referrerId: string | null = null;
    let referrerFound = false;
    
    if (referralCode) {
      console.log('🔍 Looking up referrer code:', referralCode);
      
      // Try case-insensitive lookup in case there's a mismatch
      const { data: referrer, error: referrerError } = await supabaseService
        .from('leaderboard_participants')
        .select('id, wallet_address, referral_code, invite_count, active_invite_count')
        .or(`referral_code.eq.${referralCode},referral_code.ilike.${referralCode}`)
        .limit(1)
        .single();

      // LOG THIS - Check console to see if referrer is found
      console.log('Referrer lookup result:', {
        found: !!referrer,
        referrer: referrer,
        error: referrerError
      });

      if (referrer) {
        referrerId = referrer.id;
        referrerFound = true;
        console.log('✅ Referrer found:', referrer.wallet_address);
      } else {
        console.warn('⚠️ NO REFERRER FOUND for code:', referralCode);
        // Don't fail - just continue without referrer
      }
    }

    // Insert participant with referred_by_id
    const insertData = {
      profile_id: profile.id,
      wallet_address: walletAddress,
      referral_code: newReferralCode,
      referred_by_id: referrerId, // This will be null if not found
      invite_count: 0,
      active_invite_count: 0,
      total_points: 0,
      check_in_streak: 0
    };

    console.log('📝 Inserting participant:', insertData);

    const { data: participant, error: createError } = await supabaseService
      .from('leaderboard_participants')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Create error:', createError);
      return NextResponse.json({ 
        error: 'Failed to create participant',
        details: createError.message
      }, { status: 500 });
    }

    // Verify it was saved correctly
    console.log('✅ Participant created with referred_by_id:', participant.referred_by_id);

    // Handle referral relationship if referrer exists
    if (referrerId && participant) {
      // Create invite record
      const { error: inviteError } = await supabaseService
        .from('leaderboard_invites')
        .insert({
          inviter_id: referrerId,
          invitee_id: participant.id,
          invitee_became_active_at: new Date().toISOString()
        });

      if (inviteError) {
        console.error('❌ Invite error:', inviteError);
      }

      // Increment counts
      const { error: updateError } = await supabaseService
        .from('leaderboard_participants')
        .update({
          invite_count: supabaseService.raw('invite_count + 1'),
          active_invite_count: supabaseService.raw('active_invite_count + 1')
        })
        .eq('id', referrerId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      participant,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${newReferralCode}`,
      debug: {
        referralCodeUsed: referralCode,
        referrerFound: referrerFound,
        referrerIdSet: !!participant.referred_by_id,
        participantId: participant.id,
        referredById: participant.referred_by_id
      }
    });

  } catch (error: any) {
    console.error('💥 Join error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
