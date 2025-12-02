import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/profile/link-wallet
 * Email-First Flow: Link a wallet to an existing email-registered account
 * 
 * Input: { email, address, signature, message }
 * Requirements:
 * - Verifies wallet signature
 * - Finds user by email
 * - Links wallet to their account
 * - Updates wallet_verified status
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, address, signature, message } = body;

        // Validate required fields
        if (!email || !address || !signature || !message) {
            return NextResponse.json(
                { error: 'Email, wallet address, signature, and message are required' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();

        // 1. Verify wallet signature
        const isValidSignature = await verifyWalletSignature(message, signature, normalizedAddress);
        if (!isValidSignature) {
            return NextResponse.json(
                { error: 'Invalid wallet signature' },
                { status: 400 }
            );
        }

        // 2. Find user by email
        const { data: existingUser, error: userLookupError } = await supabaseService
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        if (userLookupError || !existingUser) {
            return NextResponse.json(
                { error: 'No account found with this email. Please register first.' },
                { status: 404 }
            );
        }

        // 3. Check if wallet is already linked to another account
        const { data: walletUser } = await supabaseService
            .from('users')
            .select('id, email')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (walletUser && walletUser.id !== existingUser.id) {
            return NextResponse.json(
                { error: 'This wallet is already linked to another account' },
                { status: 409 }
            );
        }

        // 4. Link wallet to user account
        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                wallet_address: normalizedAddress,
                wallet_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);

        if (updateError) {
            console.error('Error linking wallet to user:', updateError);
            return NextResponse.json(
                { error: 'Failed to link wallet to account', details: updateError.message },
                { status: 500 }
            );
        }

        // 5. Update/create profile record
        const { error: profileError } = await supabaseService
            .from('profiles')
            .upsert({
                user_id: existingUser.id,
                address: normalizedAddress,
                on_chain: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (profileError) {
            console.error('Error updating profile record:', profileError);
            // Don't fail - profile record is for audit/indexing
        }

        return NextResponse.json({
            success: true,
            message: 'Wallet linked successfully!',
            userInfo: {
                userId: existingUser.id,
                email: normalizedEmail,
                walletAddress: normalizedAddress,
                walletVerified: true
            }
        });

    } catch (error) {
        console.error('Error linking wallet:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to link wallet' },
            { status: 500 }
        );
    }
}
