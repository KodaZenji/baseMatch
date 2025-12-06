import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
// Assuming you have a utility function to check NFT ownership
import { checkNftOwnership } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/profile/status
 * Checks if a wallet address has a registered profile (off-chain or on-chain).
 * Used by the client to gate the minting page.
 * * Logic flow: Check DB (profiles) -> Check On-Chain (NFT ownership)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        const normalizedAddress = address.toLowerCase();
        console.log('🔍 Checking profile status for:', normalizedAddress);

        // 1. Check Supabase (Off-Chain Registration)
        // Check if the user has completed the registration form (i.e., exists in the profiles table).
        // 🛑 FIX: Use 'profiles' table
        const { data: profile, error: dbError } = await supabaseService
            .from('profiles')
            .select('id')
            .eq('wallet_address', normalizedAddress)
            .single();

        // If an entry is found in the profiles table, the profile is considered registered.
        if (profile) {
            console.log('✅ Profile found in Supabase');
            return NextResponse.json({
                profileExists: true,
                source: 'Supabase (Off-Chain)',
                message: 'Profile data found in database. Proceed to dashboard or mint page.'
            });
        }

        // If DB query fails for reason other than "not found"
        // PGRST116 is the error code for "No rows found"
        if (dbError && dbError.code !== 'PGRST116') {
            console.error('❌ Supabase status check error:', dbError);
            // Ignore the error and proceed to the on-chain check
        }

        console.log('📋 No profile found in Supabase, checking on-chain...');

        // 2. Check On-Chain (NFT Ownership)
        // Check if the user's wallet already owns the NFT (prevents re-minting)

        // NOTE: checkNftOwnership is a utility function assumed to be implemented.
        const hasMintedNFT = await checkNftOwnership(normalizedAddress);

        if (hasMintedNFT) {
            console.log('✅ NFT found on-chain');
            return NextResponse.json({
                profileExists: true,
                source: 'On-Chain (NFT)',
                message: 'Profile NFT already owned.'
            });
        }

        console.log('ℹ️ No profile found anywhere - user can register/mint');
        // 3. No profile found anywhere
        return NextResponse.json({
            profileExists: false,
            message: 'User is new and needs to register/mint a profile NFT.'
        });

    } catch (error) {
        console.error('Error in profile status API:', error);
        return NextResponse.json(
            { error: 'Failed to determine profile status' },
            { status: 500 }
        );
    }
}
