import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

function getCheckInWindow(): 'morning' | 'night' | null {
  const hour = new Date().getUTCHours();
  if (hour >= 6 && hour < 18) return 'morning';
  if (hour >= 18 || hour < 6) return 'night';
  return null;
}

function getWindowFromTimestamp(timestamp: string): 'morning' | 'night' {
  const hour = new Date(timestamp).getUTCHours();
  return (hour >= 6 && hour < 18) ? 'morning' : 'night';
}

function canCheckIn(lastCheckIn: string | null, lastWindow: string | null, currentWindow: string): boolean {
  if (!lastCheckIn) return true;
  
  // Can't check in twice in same window
  if (lastWindow === currentWindow) return false;
  
  // Must be at least 12 hours since last check-in
  const lastTime = new Date(lastCheckIn).getTime();
  const now = new Date().getTime();
  const hoursSince = (now - lastTime) / (1000 * 60 * 60);
  
  return hoursSince >= 12;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    
    console.log('=== CHECK-IN REQUEST ===');
    console.log('Wallet:', walletAddress);
    
    // Validate wallet address exists and is properly formatted
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      }, { status: 400 });
    }
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_ADDRESS_FORMAT'
      }, { status: 400 });
    }
    
    const window = getCheckInWindow();
    if (!window) {
      return NextResponse.json({ error: 'Invalid check-in window' }, { status: 400 });
    }
    
    console.log('Current window:', window);
    
    // Get participant
    const { data: participant, error: participantError } = await supabaseService
      .from('leaderboard_participants')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (participantError || !participant) {
      console.error('Participant not found:', participantError);
      return NextResponse.json({ 
        error: 'Not joined leaderboard yet. Visit /race to join.',
        needsJoin: true 
      }, { status: 404 });
    }
    
    console.log('✅ Participant found:', participant.id);
    
    // Check if user has invited at least 1 person
    if (participant.invite_count < 1) {
      console.warn('⚠️ User has not invited anyone yet');
      return NextResponse.json({
        error: 'You must invite at least 1 person before you can check in',
        requiresInvite: true,
        inviteCount: participant.invite_count || 0,
        referralCode: participant.referral_code,
        referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/race?ref=${participant.referral_code}`
      }, { status: 403 });
    }
    
    console.log('✅ User has invited:', participant.invite_count, 'people');
    
    // Check if can check in
    if (!canCheckIn(participant.last_check_in, participant.last_check_in_window, window)) {
      const lastCheckTime = new Date(participant.last_check_in!);
      const nextCheckTime = new Date(lastCheckTime.getTime() + 12 * 60 * 60 * 1000);
      const minutesRemaining = Math.max(0, Math.ceil((nextCheckTime.getTime() - Date.now()) / (1000 * 60)));
      
      console.warn('⚠️ Already checked in this window');
      return NextResponse.json({
        error: 'Already checked in this window',
        canCheckIn: false,
        nextCheckInMinutes: minutesRemaining,
        lastWindow: participant.last_check_in_window
      }, { status: 429 });
    }
    
    console.log('✅ Can check in');
    
    // Calculate points
    const { data: pointsData } = await supabaseService
      .rpc('lb_calculate_checkin_points', { invite_count: participant.invite_count });
    
    const points = pointsData || (10 + Math.min(participant.invite_count, 10) ** 2);
    
    console.log('Points to award:', points);
    
    // Get current check-in number
    const { count } = await supabaseService
      .from('leaderboard_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', participant.id);
    
    const checkInNumber = (count || 0) + 1;
    
    console.log('Check-in number:', checkInNumber);
    
    
    const checkInData = {
      participant_id: participant.id,
      checkin_window: window,  
      points,
      auto_generated: false,
      invite_count_at_checkin: participant.invite_count,
      check_in_number: checkInNumber
    };
    
    console.log('Inserting check-in:', checkInData);
    
    // Create check-in record
    const { error: checkInError } = await supabaseService
      .from('leaderboard_checkins')
      .insert(checkInData);
    
    if (checkInError) {
      console.error('❌ Check-in insert error:', checkInError);
      return NextResponse.json({ 
        error: 'Failed to record check-in',
        details: checkInError.message 
      }, { status: 500 });
    }
    
    console.log('✅ Check-in recorded');
    
    // Update participant stats
    const updateData = {
      total_points: participant.total_points + points,
      last_check_in: new Date().toISOString(),
      last_check_in_window: window,
      check_in_streak: participant.check_in_streak + 1
    };
    
    console.log('Updating participant:', updateData);
    
    const { data: updated, error: updateError } = await supabaseService
      .from('leaderboard_participants')
      .update(updateData)
      .eq('id', participant.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update participant error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update participant stats',
        details: updateError.message 
      }, { status: 500 });
    }
    
    console.log('✅ Participant updated');
    
    // Log activity
    await supabaseService
      .from('leaderboard_activity_log')
      .insert({
        participant_id: participant.id,
        action_type: 'checkin',
        action_data: { window, points, check_in_number: checkInNumber }
      });
    
    console.log('✅ Activity logged');
    console.log('🎉 Check-in complete!');
    console.log('===================\n');
    
    return NextResponse.json({
      success: true,
      points,
      totalPoints: updated.total_points,
      streak: updated.check_in_streak,
      checkInNumber,
      window,
      nextWindow: window === 'morning' ? 'night' : 'morning'
    });
    
  } catch (error: any) {
    console.error('💥 Check-in error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

// GET check-in status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet')?.trim().toLowerCase();
  
  if (!walletAddress) {
    return NextResponse.json({ 
      error: 'Wallet address required',
      code: 'MISSING_ADDRESS'
    }, { status: 400 });
  }
  
  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ 
      error: 'Invalid wallet address format',
      code: 'INVALID_ADDRESS_FORMAT'
    }, { status: 400 });
  }
  
  const { data: participant } = await supabaseService
    .from('leaderboard_participants')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();
  
  if (!participant) {
    return NextResponse.json({ 
      error: 'Not joined leaderboard',
      needsJoin: true 
    }, { status: 404 });
  }
  
  const window = getCheckInWindow();
  const canCheck = canCheckIn(participant.last_check_in, participant.last_check_in_window, window!);
  
  let minutesUntilNext = 0;
  if (participant.last_check_in) {
    const lastCheckTime = new Date(participant.last_check_in);
    const nextCheckTime = new Date(lastCheckTime.getTime() + 12 * 60 * 60 * 1000);
    minutesUntilNext = Math.max(0, Math.ceil((nextCheckTime.getTime() - Date.now()) / (1000 * 60)));
  }
  
  const checkInValue = 10 + Math.min(participant.invite_count, 10) ** 2;
  
  return NextResponse.json({
    canCheckIn: canCheck,
    currentWindow: window,
    nextCheckInMinutes: minutesUntilNext,
    checkInValue,
    totalPoints: participant.total_points,
    streak: participant.check_in_streak,
    inviteCount: participant.invite_count,
    needsInvite: participant.invite_count < 1,
    autoCheckEnabled: participant.auto_check_enabled,
    autoCheckExpiry: participant.auto_check_expiry,
    referralCode: participant.referral_code,
    referralLink: `${process.env.NEXT_PUBLIC_BASE_URL}/race?ref=${participant.referral_code}`
  });
}
