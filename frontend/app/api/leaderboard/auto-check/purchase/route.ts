import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    const duration = body.duration;
    const transactionHash = body.transactionHash;
    
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address',
        code: 'INVALID_ADDRESS'
      }, { status: 400 });
    }
    
    if (!duration || !['7-days', '14-days', '28-days'].includes(duration)) {
      return NextResponse.json({ 
        error: 'Invalid duration',
        code: 'INVALID_DURATION'
      }, { status: 400 });
    }
    
    if (!transactionHash) {
      return NextResponse.json({ 
        error: 'Transaction hash required',
        code: 'MISSING_TRANSACTION'
      }, { status: 400 });
    }
    
    // Get participant
    const { data: participant, error: participantError } = await supabaseService
      .from('leaderboard_participants')
      .select('id, wallet_address, auto_check_enabled, auto_check_expiry')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (participantError || !participant) {
      return NextResponse.json({ 
        error: 'Not joined leaderboard. Please join first.',
        needsJoin: true 
      }, { status: 404 });
    }
    
    // Pricing
    const prices: Record<string, number> = {
      '7-days': 0.60,
      '14-days': 1.00,
      '28-days': 1.50
    };
    
    const amountUsd = prices[duration];
    
    // Calculate expiry
    const now = new Date();
    const currentExpiry = participant.auto_check_expiry ? new Date(participant.auto_check_expiry) : now;
    const startDate = currentExpiry > now ? currentExpiry : now;
    
    const expiryDate = new Date(startDate);
    const durationDays = parseInt(duration.split('-')[0]);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabaseService
      .from('leaderboard_purchases')
      .insert({
        participant_id: participant.id,
        duration,
        amount_usd: amountUsd,
        transaction_hash: transactionHash,
        payment_method: 'USDC',
        payment_status: 'completed',
        activated_at: now.toISOString(),
        expires_at: expiryDate.toISOString()
      })
      .select()
      .single();
    
    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      return NextResponse.json({ 
        error: 'Failed to create purchase record',
        code: 'PURCHASE_CREATE_ERROR'
      }, { status: 500 });
    }
    
    // Enable auto-check
    const { error: updateError } = await supabaseService
      .from('leaderboard_participants')
      .update({
        auto_check_enabled: true,
        auto_check_expiry: expiryDate.toISOString()
      })
      .eq('id', participant.id);
    
    if (updateError) {
      console.error('Update participant error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to activate auto-check',
        code: 'ACTIVATION_ERROR'
      }, { status: 500 });
    }
    
    // Log activity
    await supabaseService
      .from('leaderboard_activity_log')
      .insert({
        participant_id: participant.id,
        action_type: 'purchase',
        action_data: { 
          duration, 
          amount: amountUsd, 
          transaction_hash: transactionHash 
        }
      });
    
    return NextResponse.json({
      success: true,
      purchase,
      expiresAt: expiryDate.toISOString()
    });
    
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
