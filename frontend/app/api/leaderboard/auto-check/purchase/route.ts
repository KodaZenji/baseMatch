import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = body.walletAddress?.trim().toLowerCase();
    const duration = body.duration;
    const transactionHash = body.transactionHash;
    
    // ✅ Validate wallet address
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required',
        code: 'MISSING_ADDRESS'
      }, { status: 400 });
    }
    
    // ✅ Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address format',
        code: 'INVALID_ADDRESS_FORMAT'
      }, { status: 400 });
    }
    
    if (!duration) {
      return NextResponse.json({ 
        error: 'Duration is required',
        code: 'MISSING_DURATION'
      }, { status: 400 });
    }
    
    // Get participant
    const { data: participant, error: participantError } = await supabaseClient
      .from('leaderboard_participants')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (participantError || !participant) {
      return NextResponse.json({ 
        error: 'Not joined leaderboard. Please join first.',
        needsJoin: true 
      }, { status: 404 });
    }
    
    // ✅ Validate duration and pricing
    const prices: Record<string, number> = {
      '7-days': 0.60,
      '14-days': 1.00,
      '28-days': 1.50
    };
    
    const amountUsd = prices[duration];
    if (!amountUsd) {
      return NextResponse.json({ 
        error: 'Invalid duration. Must be 7-days, 14-days, or 28-days',
        code: 'INVALID_DURATION'
      }, { status: 400 });
    }
    
    // Calculate expiry
    const now = new Date();
    const expiryDate = new Date(now);
    
    const durationDays = parseInt(duration.split('-')[0]);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    // ✅ Create purchase record BEFORE payment
    // This allows BasePay to verify the purchase exists
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('leaderboard_purchases')
      .insert({
        participant_id: participant.id,
        duration,
        amount_usd: amountUsd,
        transaction_hash: transactionHash || null,
        payment_status: 'pending',
        activated_at: null, // Will be set when payment confirms
        expires_at: null    // Will be set when payment confirms
      })
      .select()
      .single();
    
    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      return NextResponse.json({ 
        error: 'Failed to create purchase record',
        code: 'PURCHASE_CREATE_ERROR',
        details: purchaseError.message
      }, { status: 500 });
    }
    
    // ✅ Return purchase details for BasePay
    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        participant_id: participant.id,
        wallet_address: participant.wallet_address,
        duration,
        amount_usd: amountUsd,
        payment_status: 'pending'
      },
      // BasePay needs these for payment processing
      payment: {
        recipient: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x...', // Your treasury address
        amount: amountUsd,
        currency: 'USDC'
      }
    });
    
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

// ✅ Add webhook endpoint to confirm payments from BasePay
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { purchaseId, transactionHash, status } = body;
    
    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 });
    }
    
    // Get purchase
    const { data: purchase, error: fetchError } = await supabaseClient
      .from('leaderboard_purchases')
      .select('*, leaderboard_participants!inner(id, wallet_address)')
      .eq('id', purchaseId)
      .single();
    
    if (fetchError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    
    // Update purchase with transaction
    const now = new Date();
    const expiryDate = new Date(now);
    const durationDays = parseInt(purchase.duration.split('-')[0]);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    const { error: updateError } = await supabaseClient
      .from('leaderboard_purchases')
      .update({
        transaction_hash: transactionHash,
        payment_status: status || 'completed',
        activated_at: now.toISOString(),
        expires_at: expiryDate.toISOString()
      })
      .eq('id', purchaseId);
    
    if (updateError) {
      console.error('Update purchase error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Enable auto-check for participant
    await supabaseClient
      .from('leaderboard_participants')
      .update({
        auto_check_enabled: true,
        auto_check_expiry: expiryDate.toISOString()
      })
      .eq('id', purchase.participant_id);
    
    // Log activity
    await supabaseClient
      .from('leaderboard_activity_log')
      .insert({
        participant_id: purchase.participant_id,
        action_type: 'purchase',
        action_data: { 
          duration: purchase.duration, 
          amount: purchase.amount_usd, 
          transaction_hash: transactionHash 
        }
      });
    
    return NextResponse.json({
      success: true,
      expiresAt: expiryDate.toISOString()
    });
    
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
