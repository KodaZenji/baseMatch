import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
// Assuming you have a utility function to check NFT ownership
import { checkNftOwnership } from '@/lib/utils'; 

export const runtime = 'nodejs';

/**
 * POST /api/profile/status
 * Checks if a wallet address has a registered profile (off-chain or on-chain).
 * Used by the client to gate the minting page.
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

        // 1. Check Supabase (Off-Chain Registration)
        // If the user has completed the registration form but hasn't minted yet.
        const { data: user, error: dbError } = await supabaseService
            .from('users')
            .select('id')
            .eq('wallet_address', normalizedAddress)
            .single();
        
        // If an entry is found in the users table, the profile is considered registered.
        if (user) {
            return NextResponse.json({
                profileExists: true,
                source: 'Supabase (Off-Chain)',
                message: 'Profile data found in database. Proceed to dashboard.'
            });
        }
        
        // If DB query fails for reason other than "not found"
        if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('Supabase status check error:', dbError);
            // We ignore the error and proceed to the on-chain check
        }

        // 2. Check On-Chain (NFT Ownership)
        // Check if the user's wallet already owns the NFT (This check prevents re-minting)
        
        // NOTE: You must implement the checkNftOwnership function in '@/lib/utils'
        // This function will typically use Viem/Wagmi to call 'balanceOf(address)' on your NFT contract.
        const hasMintedNFT = await checkNftOwnership(normalizedAddress); 

        if (hasMintedNFT) {
            return NextResponse.json({
                profileExists: true,
                source: 'On-Chain (NFT)',
                message: 'Profile NFT already owned.'
            });
        }

        // 3. No profile found anywhere
        return NextResponse.json({
            profileExists: false,
            message: 'User is new and needs to mint a profile NFT.'
        });

    } catch (error) {
        console.error('Error in profile status API:', error);
        return NextResponse.json(
            { error: 'Failed to determine profile status' },
            { status: 500 }
        );
    }
}
