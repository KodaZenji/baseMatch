import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature } from '@/lib/utils'; // Assumed to be imported

export const runtime = 'nodejs';

/**
 * POST /api/profile/link-wallet
 * Email-First Flow: Link a wallet to an existing email-registered profile
 * * Input: { email, address, signature, message }
 * Requirements:
 * - Verifies wallet signature
 * - Finds profile by email
 * - Links wallet to the profile account in the 'profiles' table
 * - Sets wallet_verified status to true
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

        // 2. Find profile by email
        // 🛑 FIX 1: Use 'profiles' table
        const { data: existingProfile, error: profileLookupError } = await supabaseService
            .from('profiles')
            .select('id, email_verified')
            .eq('email', normalizedEmail)
            .single();

        if (profileLookupError || !existingProfile) {
            return NextResponse.json(
                { error: 'No account found with this email. Please register first.' },
                { status: 404 }
            );
        }

        // 3. Check if wallet is already linked to another profile
        // 🛑 FIX 2: Use 'profiles' table
        const { data: walletProfile } = await supabaseService
            .from('profiles')
            .select('id, email')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (walletProfile && walletProfile.id !== existingProfile.id) {
            return NextResponse.json(
                { error: 'This wallet is already linked to another profile' },
                { status: 409 }
            );
        }

        // 4. Link wallet to profile account
        // 🛑 FIX 3: Use 'profiles' table
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                wallet_address: normalizedAddress,
                wallet_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);

        if (updateError) {
            console.error('Error linking wallet to profile:', updateError);
            return NextResponse.json(
                { error: 'Failed to link wallet to account', details: updateError.message },
                { status: 500 }
            );
        }

        // 🛑 REMOVED STEP 5: The separate upsert to 'profiles' is redundant
        // since the main update in step 4 now handles the 'profiles' table.

        return NextResponse.json({
            success: true,
            message: 'Wallet linked successfully!',
            userInfo: {
                profileId: existingProfile.id, // Consistent with 'profiles' table name
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
