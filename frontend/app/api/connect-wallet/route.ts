// FILE: app/api/connect-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/connect-wallet
 * Email-First Flow: Connect wallet to existing email profile
 * Input: { email, walletAddress, signature, nonce, issuedAt }
 * Requirements:
 * - Profile must have verified email first
 * - Verifies wallet signature (EIP-712 typed data)
 * - Updates PROFILES table with wallet_address and wallet_verified
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, walletAddress, signature, nonce, issuedAt } = body;

    // Validate input
    if (!email || !walletAddress || !signature || !nonce || !issuedAt) {
      return NextResponse.json(
        { error: 'Email, wallet address, signature, nonce, and issuedAt are required' },
        { status: 400 }
      );
    }

    // Normalize inputs
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedAddress = walletAddress.toLowerCase();

    // 1️⃣ Verify typed wallet signature
    const isValidSignature = await verifyWalletSignature(signature, {
      address: normalizedAddress,
      nonce,
      issuedAt,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid wallet signature' },
        { status: 400 }
      );
    }

    // 2️⃣ Find profile by email
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found with this email. Please register first.' },
        { status: 404 }
      );
    }

    // 3️⃣ Ensure email is verified first
    if (!profile.email_verified) {
      return NextResponse.json(
        {
          error: 'Email not verified. Please verify your email before connecting wallet.',
          requiresEmailVerification: true
        },
        { status: 400 }
      );
    }

    // 4️⃣ Check if wallet is already connected to another profile
    const { data: existingWallet } = await supabaseService
      .from('profiles')
      .select('id, email')
      .eq('wallet_address', normalizedAddress)
      .neq('id', profile.id)
      .single();

    if (existingWallet) {
      return NextResponse.json(
        { error: 'This wallet is already connected to another profile' },
        { status: 409 }
      );
    }

    // 5️⃣ Update profile with wallet info
    const { error: updateError } = await supabaseService
      .from('profiles')
      .update({
        wallet_address: normalizedAddress,
        wallet_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile with wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to connect wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet connected successfully!',
      profileId: profile.id,
      fullyVerified: true
    });

  } catch (error) {
    console.error('Error connecting wallet:', error);
    return NextResponse.json(
      { error: 'Failed to process wallet connection' },
      { status: 500 }
    );
  }
}
