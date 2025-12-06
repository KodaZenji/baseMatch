import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils'; 

export const runtime = 'nodejs';


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
