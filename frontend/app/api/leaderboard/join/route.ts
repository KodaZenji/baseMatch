import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { walletAddress, referralCode } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, wallet_address, name, gender, photoUrl, farcaster_username, farcaster_verified, discord_verified')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found. Please create a profile first.',
        needsProfile: true 
      }, { status: 404 });
    }
    
    // Check if user already joined leaderboard
    const { data: existing, error: existingError } = await supabaseClient
      .from('leaderboard_participants')
      .select('*, profiles!inner(*)')
      .eq('profile_id', profile.id)
      .single();
    
    if (existing) {
      // Already joined - return their data
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        participant: existing,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${existing.referral_code}`
      });
    }
    
    // Generate referral code
    const { data: codeData } = await supabaseClient.rpc('lb_generate_referral_code');
    const newReferralCode = codeData;
    
    // Create leaderboard participant
    const { data: participant, error: createError } = await supabaseClient
      .from('leaderboard_participants')
      .insert({
        profile_id: profile.id,
        wallet_address: walletAddress,
        referral_code: newReferralCode,
        referred_by: referralCode || null
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Create participant error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    
    // If they were referred, create invite relationship
    if (referralCode) {
      const { data: referrer } = await supabaseClient
        .from('leaderboard_participants')
        .select('id, profile_id')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer) {
        // Create invite relationship
        await supabaseClient
          .from('leaderboard_invites')
          .insert({
            inviter_id: referrer.id,
            invitee_id: participant.id
          });
        
        // Increment inviter's invite count
        await supabaseClient
          .from('leaderboard_participants')
          .update({ 
            invite_count: supabaseClient.sql`invite_count + 1` 
          })
          .eq('id', referrer.id);
        
        // Log activity
        await supabaseClient
          .from('leaderboard_activity_log')
          .insert({
            participant_id: referrer.id,
            action_type: 'invite',
            action_data: { invitee_wallet: walletAddress }
          });
      }
    }
    
    // Log join activity
    await supabaseClient
      .from('leaderboard_activity_log')
      .insert({
        participant_id: participant.id,
        action_type: 'join',
        action_data: { 
          referred_by: referralCode,
          profile_name: profile.name 
        }
      });
    
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
