// app/api/leaderboard/auto-check/purchase/route.ts

import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { walletAddress, duration, transactionHash } = await request.json();
    
    if (!walletAddress || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get participant
    const { data: participant } = await supabaseClient
      .from('leaderboard_participants')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (!participant) {
      return NextResponse.json({ error: 'Not joined leaderboard' }, { status: 404 });
    }
    
    const prices: Record<string, number> = {
      '7-days': 0.60,
      '14-days': 1.00,
      '28-days': 1.50
    };
    
    const amountUsd = prices[duration];
    if (!amountUsd) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }
    
    // Calculate expiry
    const now = new Date();
    const expiryDate = new Date(now);
    
    if (duration === '7-days') expiryDate.setDate(expiryDate.getDate() + 7);
    if (duration === '14-days') expiryDate.setDate(expiryDate.getDate() + 14);
    if (duration === '28-days') expiryDate.setDate(expiryDate.getDate() + 28);
    
    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('leaderboard_purchases')
      .insert({
        participant_id: participant.id,
        duration,
        amount_usd: amountUsd,
        transaction_hash: transactionHash,
        payment_status: 'pending',
        activated_at: now.toISOString(),
        expires_at: expiryDate.toISOString()
      })
      .select()
      .single();
    
    if (purchaseError) {
      console.error('Purchase error:', purchaseError);
      return NextResponse.json({ error: purchaseError.message }, { status: 500 });
    }
    
    // Enable auto-check for participant
    await supabaseClient
      .from('leaderboard_participants')
      .update({
        auto_check_enabled: true,
        auto_check_expiry: expiryDate.toISOString()
      })
      .eq('id', participant.id);
    
    // Log activity
    await supabaseClient
      .from('leaderboard_activity_log')
      .insert({
        participant_id: participant.id,
        action_type: 'purchase',
        action_data: { duration, amount: amountUsd, transaction_hash: transactionHash }
      });
    
    return NextResponse.json({
      success: true,
      purchase,
      expiresAt: expiryDate.toISOString()
    });
    
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
