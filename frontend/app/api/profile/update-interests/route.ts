// frontend/app/api/profile/update-interests/route.ts
// REPLACE your entire file with this updated version

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/update-interests
 * Update user interests on-chain
 * Input: { walletAddress, newInterests }
 * Requirements:
 * - Profile must be fully verified (email_verified AND wallet_verified)
 * - Updates DB optimistically (UX optimization)
 * - Returns encoded transaction data for on-chain update
 * - Creates notification when interests are updated
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

        // 1. Lookup profile by walletAddress
        const { data: profile, error: profileError } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found with this wallet address' },
                { status: 404 }
            );
        }

        // 2. REQUIRE Fully Verified status to proceed
        if (!profile.email_verified || !profile.wallet_verified) {
            return NextResponse.json(
                {
                    error: 'Account not fully verified. Both email and wallet must be verified to update interests.',
                    emailVerified: profile.email_verified,
                    walletVerified: profile.wallet_verified
                },
                { status: 403 }
            );
        }

        // 3. Update DB (UX Optimization) - Update interests optimistically
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                interests: newInterests,
                updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

        if (updateError) {
            console.error('Error updating interests in DB:', updateError);
            return NextResponse.json(
                { error: 'Failed to update interests in database' },
                { status: 500 }
            );
        }

        // ============ CREATE PROFILE UPDATE NOTIFICATION ============
        try {
            await supabaseService
                .from('notifications')
                .insert({
                    user_address: normalizedAddress,
                    type: 'profile_complete',
                    title: '✅ Interests Updated!',
                    message: 'Your interests have been successfully updated!',
                    metadata: {
                        profile_id: profile.id,
                        updated_field: 'interests',
                        new_interests: newInterests
                    }
                });
            
            console.log('✅ Interests update notification created for:', normalizedAddress);
        } catch (notifError) {
            // Don't fail the update if notification fails
            console.error('Failed to create interests notification:', notifError);
        }
        
        
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
                profile.name || '',
                profile.age || 18,
                profile.gender || '',
                newInterests, // Updated interests
                profile.photo_url || '',
                profile.email || ''
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
            updatedInterests: newInterests,
            userInfo: {
                profileId: profile.id,
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
