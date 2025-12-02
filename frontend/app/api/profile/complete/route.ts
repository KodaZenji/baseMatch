import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { calculatePhotoHash } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/complete
 * Email-First Flow: Complete profile after email & wallet verification
 * 
 * Input: { email, walletAddress, name, age, gender, interests, photoUrl }
 * Requirements:
 * - User must be fully verified (email_verified=TRUE AND wallet_verified=TRUE)
 * - Handles photo upload (or accepts photoUrl)
 * - Calculates photoHash
 * - Returns minting payload for frontend to call createProfile contract function
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, walletAddress, name, age, gender, interests, photoUrl } = body;

        // Validate required fields
        if (!email || !walletAddress || !name || !age || !gender || !interests) {
            return NextResponse.json(
                { error: 'Email, wallet address, name, age, gender, and interests are required' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedAddress = walletAddress.toLowerCase();

        // 1. Find user and verify they are fully verified
        const { data: user, error: userError } = await supabaseService
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('wallet_address', normalizedAddress)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found. Please complete registration first.' },
                { status: 404 }
            );
        }

        // 2. CRUCIAL CHECK: User must be fully verified
        if (!user.email_verified || !user.wallet_verified) {
            return NextResponse.json(
                {
                    error: 'Account not fully verified. Both email and wallet must be verified.',
                    emailVerified: user.email_verified,
                    walletVerified: user.wallet_verified
                },
                { status: 400 }
            );
        }

        // 3. Validate profile data
        if (age < 18 || age > 120) {
            return NextResponse.json(
                { error: 'Age must be between 18 and 120' },
                { status: 400 }
            );
        }

        if (name.length < 2 || name.length > 100) {
            return NextResponse.json(
                { error: 'Name must be between 2 and 100 characters' },
                { status: 400 }
            );
        }

        if (!interests || interests.length === 0 || interests.length > 500) {
            return NextResponse.json(
                { error: 'Interests must be between 1 and 500 characters' },
                { status: 400 }
            );
        }

        // 4. Handle photo (either upload or use provided URL)
        let finalPhotoUrl = photoUrl || '';

        // If no photo URL provided, they should upload via /api/upload-image first
        if (!finalPhotoUrl) {
            return NextResponse.json(
                { error: 'Photo URL is required. Please upload an image first.' },
                { status: 400 }
            );
        }

        // 5. Calculate photo hash for on-chain storage
        const photoHash = calculatePhotoHash(finalPhotoUrl);

        // 6. Update users table with complete profile data
        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                name,
                age,
                gender,
                interests,
                photo_url: finalPhotoUrl,
                photo_hash: photoHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error updating user profile:', updateError);
            return NextResponse.json(
                { error: 'Failed to save profile data' },
                { status: 500 }
            );
        }

        // 7. Create/update profile record in profiles table (for off-chain indexing)
        const { error: profileError } = await supabaseService
            .from('profiles')
            .upsert({
                user_id: user.id,
                address: normalizedAddress,
                on_chain: false, // Will be set to true after successful minting
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (profileError) {
            console.error('Error creating profile record:', profileError);
            // Don't fail the request - profile record is for indexing only
        }

        // 8. Return minting payload for frontend to call createProfile
        // The contract function signature is:
        // function createProfile(string name, uint8 age, string gender, string interests, string photoUrl)

        return NextResponse.json({
            success: true,
            message: 'Profile data saved. Ready to mint on-chain.',
            contractAddress: PROFILE_NFT_ADDRESS,
            mintingPayload: {
                name,
                age,
                gender,
                interests,
                photoUrl: finalPhotoUrl,
                email: normalizedEmail,
                photoHash
            },
            // Additional info for frontend
            userInfo: {
                userId: user.id,
                email: normalizedEmail,
                walletAddress: normalizedAddress
            }
        });

    } catch (error) {
        console.error('Error completing profile:', error);
        return NextResponse.json(
            { error: 'Failed to process profile completion' },
            { status: 500 }
        );
    }
}
