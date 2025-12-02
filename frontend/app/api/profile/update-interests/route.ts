import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/update-interests
 * Update user interests on-chain
 * 
 * Input: { walletAddress, newInterests }
 * Requirements:
 * - User must be fully verified (email_verified AND wallet_verified)
 * - Updates DB optimistically (UX optimization)
 * - Returns encoded transaction data for on-chain update
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, newInterests } = body;

        // Validate input
        if (!walletAddress || !newInterests) {
            return NextResponse.json(
                { error: 'Wallet address and new interests are required' },
                { status: 400 }
            );
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // Validate interests length
        if (newInterests.length === 0 || newInterests.length > 500) {
            return NextResponse.json(
                { error: 'Interests must be between 1 and 500 characters' },
                { status: 400 }
            );
        }

        // 1. Lookup user by walletAddress
        const { data: user, error: userError } = await supabaseService
            .from('users')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found with this wallet address' },
                { status: 404 }
            );
        }

        // 2. REQUIRE Fully Verified status to proceed
        if (!user.email_verified || !user.wallet_verified) {
            return NextResponse.json(
                {
                    error: 'Account not fully verified. Both email and wallet must be verified to update interests.',
                    emailVerified: user.email_verified,
                    walletVerified: user.wallet_verified
                },
                { status: 403 }
            );
        }

        // 3. Update DB (UX Optimization) - Update optimistically
        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                interests: newInterests,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error updating interests in DB:', updateError);
            return NextResponse.json(
                { error: 'Failed to update interests in database' },
                { status: 500 }
            );
        }

        // 4. Encode Transaction Data using viem
        // The contract has updateProfile(name, age, gender, interests, photoUrl, email)
        // We need to fetch current profile data and only update interests

        // Using viem's encodeFunctionData
        const { encodeFunctionData } = await import('viem');

        const callData = encodeFunctionData({
            abi: [
                {
                    name: 'updateProfile',
                    type: 'function',
                    stateMutability: 'nonpayable',
                    inputs: [
                        { name: 'name', type: 'string' },
                        { name: 'age', type: 'uint8' },
                        { name: 'gender', type: 'string' },
                        { name: 'interests', type: 'string' },
                        { name: 'photoUrl', type: 'string' },
                        { name: 'email', type: 'string' }
                    ],
                    outputs: []
                }
            ],
            functionName: 'updateProfile',
            args: [
                user.name || '',
                user.age || 18,
                user.gender || '',
                newInterests, // Updated interests
                user.photo_url || '',
                user.email || ''
            ]
        });

        // 5. Return Transaction Payload to frontend
        return NextResponse.json({
            success: true,
            message: 'Database updated. Please sign transaction to update on-chain.',
            onChainPayload: {
                to: PROFILE_NFT_ADDRESS,
                data: callData
            },
            // Additional info for confirmation
            updatedInterests: newInterests,
            userInfo: {
                userId: user.id,
                walletAddress: normalizedAddress
            }
        });

    } catch (error) {
        console.error('Error updating interests:', error);
        return NextResponse.json(
            { error: 'Failed to process interests update' },
            { status: 500 }
        );
    }
}
