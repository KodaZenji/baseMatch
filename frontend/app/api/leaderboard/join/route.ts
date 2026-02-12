import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    const referralCode = body.referralCode?.trim()?.toUpperCase() || null;

    console.log('=== JOIN REQUEST ===');
    console.log('Wallet:', walletAddress);
    console.log('Referral Code:', referralCode);

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      console.error('Invalid wallet address format');
      return NextResponse.json({ 
        error: 'Invalid wallet address',
        code: 'INVALID_ADDRESS'
      }, { status: 400 });
    }

    // Get profile from profiles table
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, wallet_address, name, gender')
      .eq('wallet_address', walletAddress)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError?.message);
      return NextResponse.json({ 
        error: 'Profile not found. Please create a profile first.',
        needsProfile: true,
        code: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    console.log('✅ Profile found:', profile.id);

    // Check if already joined the leaderboard
    const { data: existing, error: existingError } = await supabaseService
      .from('leaderboard_participants')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing participant:', existingError);
    }

    if (existing) {
      console.log('ℹ️ User already joined:', existing.id);
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        participant: existing,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${existing.referral_code}`
      });
    }

    // Generate unique referral code
    const { data: newReferralCode, error: codeError } = await supabaseService
      .rpc('lb_generate_referral_code');
    
    if (codeError || !newReferralCode) {
      console.error('Failed to generate referral code:', codeError);
      return NextResponse.json({ 
        error: 'Failed to generate referral code',
        code: 'CODE_GENERATION_FAILED'
      }, { status: 500 });
    }

    console.log('✅ Generated referral code:', newReferralCode);

    // Lookup referrer if referral code was provided
    let referrerId: string | null = null;
    let referrerData: any = null;
    
    if (referralCode) {
      console.log('🔍 Looking up referrer with code:', referralCode);
      
      // Try to find the referrer - use OR query to handle case sensitivity
      const { data: referrer, error: referrerError } = await supabaseService
        .from('leaderboard_participants')
        .select('id, wallet_address, referral_code, invite_count, active_invite_count')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (referrerError) {
        console.error('❌ Error looking up referrer:', referrerError);
      }

      if (referrer) {
        referrerId = referrer.id;
        referrerData = referrer;
        console.log('✅ Found referrer:', {
          id: referrer.id,
          wallet: referrer.wallet_address,
          code: referrer.referral_code,
          currentInvites: referrer.invite_count,
          currentActiveInvites: referrer.active_invite_count
        });
      } else {
        console.warn('⚠️ No referrer found for code:', referralCode);
        console.warn('This means either:');
        console.warn('1. The code does not exist in the database');
        console.warn('2. RLS policy is blocking the query');
        console.warn('3. The code has a typo');
      }
    }

    // Prepare participant data
    const participantData = {
      profile_id: profile.id,
      wallet_address: walletAddress,
      referral_code: newReferralCode,
      referred_by_id: referrerId, // Will be null if no valid referrer found
      invite_count: 0,
      active_invite_count: 0,
      total_points: 0,
      check_in_streak: 0,
      is_eligible: true
    };

    console.log('📝 Creating participant with data:', participantData);

    // Insert new participant
    const { data: participant, error: createError } = await supabaseService
      .from('leaderboard_participants')
      .insert(participantData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create participant:', createError);
      return NextResponse.json({ 
        error: 'Failed to create participant',
        details: createError.message,
        code: 'PARTICIPANT_CREATION_FAILED'
      }, { status: 500 });
    }

    if (!participant) {
      console.error('❌ Participant created but no data returned');
      return NextResponse.json({ 
        error: 'Failed to create participant - no data returned',
        code: 'NO_PARTICIPANT_DATA'
      }, { status: 500 });
    }

    console.log('✅ Participant created successfully:', {
      id: participant.id,
      referral_code: participant.referral_code,
      referred_by_id: participant.referred_by_id
    });

    // If there was a valid referrer, establish the relationship
    if (referrerId && participant) {
      console.log('🔗 Establishing referral relationship...');
      
      // 1. Create invite record
      const { data: inviteRecord, error: inviteError } = await supabaseService
        .from('leaderboard_invites')
        .insert({
          inviter_id: referrerId,
          invitee_id: participant.id,
          invitee_became_active_at: new Date().toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error('❌ Failed to create invite record:', inviteError);
      } else {
        console.log('✅ Invite record created:', inviteRecord.id);
      }

      // 2. Update referrer's invite counts
      const newInviteCount = (referrerData?.invite_count || 0) + 1;
      const newActiveInviteCount = (referrerData?.active_invite_count || 0) + 1;

      const { data: updatedReferrer, error: updateError } = await supabaseService
        .from('leaderboard_participants')
        .update({
          invite_count: newInviteCount,
          active_invite_count: newActiveInviteCount
        })
        .eq('id', referrerId)
        .select('id, invite_count, active_invite_count')
        .single();

      if (updateError) {
        console.error('❌ Failed to update referrer invite counts:', updateError);
      } else {
        console.log('✅ Referrer invite counts updated:', {
          id: updatedReferrer.id,
          invite_count: updatedReferrer.invite_count,
          active_invite_count: updatedReferrer.active_invite_count
        });
      }

      // 3. Log the referral activity
      const { error: logError } = await supabaseService
        .from('leaderboard_activity_log')
        .insert({
          participant_id: referrerId,
          action_type: 'invite',
          action_data: { 
            invitee_id: participant.id,
            invitee_wallet: walletAddress,
            became_active: true,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('❌ Failed to log referral activity:', logError);
      } else {
        console.log('✅ Referral activity logged');
      }

      // 4. Verify the relationship was established
      const { data: verification } = await supabaseService
        .from('leaderboard_participants')
        .select('id, referred_by_id, referral_code')
        .eq('id', participant.id)
        .single();

      console.log('🔍 Verification - Participant referred_by_id:', verification?.referred_by_id);
      
      if (!verification?.referred_by_id) {
        console.error('⚠️ WARNING: referred_by_id was not saved properly!');
      }
    } else if (referralCode && !referrerId) {
      console.warn('⚠️ Referral code was provided but no referrer was found');
      console.warn('Participant created without referrer relationship');
    }

    console.log('🎉 Join process complete!');
    console.log('===================\n');

    // Return success response
    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      participant: participant,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://basematch.app'}/race?ref=${newReferralCode}`,
      needsInvite: participant.invite_count < 1,
      debug: {
        referralCodeProvided: !!referralCode,
        referralCodeValue: referralCode,
        referrerFound: !!referrerId,
        referrerIdInDb: participant.referred_by_id,
        participantId: participant.id,
        participantCode: participant.referral_code
      }
    });

  } catch (error: any) {
    console.error('💥 CRITICAL ERROR in join endpoint:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json({ 
      error: error.message || 'Unknown error occurred',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error 
      })
    }, { status: 500 });
  }
}
