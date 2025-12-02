import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/connect-wallet
 * Email-First Flow: Connect wallet to existing email account
 * 
 * Input: { email, walletAddress, signature, message }
 * Requirements:
 * - User must have verified email first
 * - Verifies wallet signature
 * - Updates users table with wallet_address and wallet_verified
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, walletAddress, signature, message } = body;

        // Validate input
        if (!email || !walletAddress || !signature || !message) {
            return NextResponse.json(
                { error: 'Email, wallet address, signature, and message are required' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedAddress = walletAddress.toLowerCase();

        // 1. Verify wallet signature
        const isValidSignature = await verifyWalletSignature(message, signature, normalizedAddress);

        if (!isValidSignature) {
            return NextResponse.json(
                { error: 'Invalid wallet signature' },
                { status: 400 }
            );
        }

        // 2. Find user by email
        const { data: user, error: userError } = await supabaseService
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found with this email. Please register first.' },
                { status: 404 }
            );
        }

        // 3. CRUCIAL CHECK: User must have verified email first
        if (!user.email_verified) {
            return NextResponse.json(
                {
                    error: 'Email not verified. Please verify your email before connecting wallet.',
                    requiresEmailVerification: true
                },
                { status: 400 }
            );
        }

        // 4. Check if wallet is already connected to another account
        const { data: existingWallet, error: walletCheckError } = await supabaseService
            .from('users')
            .select('id, email')
            .eq('wallet_address', normalizedAddress)
            .neq('id', user.id)
            .single();

        if (existingWallet) {
            return NextResponse.json(
                { error: 'This wallet is already connected to another account' },
                { status: 409 }
            );
        }

        // 5. Update user record with wallet information
        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                wallet_address: normalizedAddress,
                wallet_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error updating user with wallet:', updateError);
            return NextResponse.json(
                { error: 'Failed to connect wallet' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Wallet connected successfully!',
            userId: user.id,
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
