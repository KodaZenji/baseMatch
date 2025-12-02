import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature, generateToken, sendVerificationEmail, calculatePhotoHash } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/register
 * Wallet-First Flow: Register profile with wallet signature, trigger email verification if needed
 * 
 * Input: { address, name, age, gender, interests, email (MANDATORY), photoUrl, signature, message }
 * Requirements:
 * - Verifies wallet signature
 * - Creates/links user profile
 * - Triggers email verification if email not verified
 * - Returns createProfile payload and needsEmailVerification flag
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, name, age, gender, interests, email, photoUrl, signature, message } = body;

        // Validate required fields
        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required for registration' },
                { status: 400 }
            );
        }

        if (!name || !age || !gender || !interests) {
            return NextResponse.json(
                { error: 'Name, age, gender, and interests are required' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();

        // 1. Verify wallet signature if provided
        if (signature && message) {
            const isValidSignature = await verifyWalletSignature(message, signature, normalizedAddress);
            if (!isValidSignature) {
                return NextResponse.json(
                    { error: 'Invalid wallet signature' },
                    { status: 400 }
                );
            }
        }

        // 2. Validate profile data
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

        // 3. Handle photo upload/hashing
        const finalPhotoUrl = photoUrl || '';
        const photoHash = finalPhotoUrl ? calculatePhotoHash(finalPhotoUrl) : '';

        // 4. User Lookup: Find existing user by email OR wallet
        const { data: existingUserByEmail } = await supabaseService
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        const { data: existingUserByWallet } = await supabaseService
            .from('users')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .single();

        // Check for conflicts
        if (existingUserByEmail && existingUserByWallet && existingUserByEmail.id !== existingUserByWallet.id) {
            return NextResponse.json(
                { error: 'Email is already associated with a different wallet address' },
                { status: 409 }
            );
        }

        const existingUser = existingUserByEmail || existingUserByWallet;

        let userId: string;
        let needsEmailVerification = false;

        // 5. Upsert Logic
        if (existingUser) {
            // User exists - update their record to link wallet and email
            const { error: updateError } = await supabaseService
                .from('users')
                .update({
                    wallet_address: normalizedAddress,
                    wallet_verified: true,
                    email: normalizedEmail, // Update email if they registered with wallet first
                    name,
                    age,
                    gender,
                    interests,
                    photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingUser.id);

            if (updateError) {
                console.error('Error updating existing user:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update existing user profile', details: updateError.message },
                    { status: 500 }
                );
            }

            userId = existingUser.id;
            needsEmailVerification = !existingUser.email_verified;
        } else {
            // New user - create record
            const { data: newUser, error: createError } = await supabaseService
                .from('users')
                .insert([{
                    email: normalizedEmail,
                    wallet_address: normalizedAddress,
                    wallet_verified: true,
                    email_verified: false,
                    name,
                    age,
                    gender,
                    interests,
                    photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select('id')
                .single();

            if (createError || !newUser) {
                console.error('Error creating new user:', createError);
                return NextResponse.json(
                    { error: 'Failed to create user account', details: createError?.message },
                    { status: 500 }
                );
            }

            userId = newUser.id;
            needsEmailVerification = true;
        }

        // 6. Verification Trigger: Send email verification if needed
        if (needsEmailVerification) {
            try {
                const token = generateToken();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                // Insert token into email_verifications
                const { error: tokenError } = await supabaseService
                    .from('email_verifications')
                    .insert([{
                        user_id: userId,
                        email: normalizedEmail,
                        token,
                        expires_at: expiresAt.toISOString(),
                        created_at: new Date().toISOString()
                    }]);

                if (tokenError) {
                    console.error('Error creating email verification token:', tokenError);
                    // Don't fail registration, but log the error
                } else {
                    // Send verification email
                    await sendVerificationEmail(normalizedEmail, token);
                }
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
                // Don't fail registration if email sending fails
            }
        }

        // 7. Insert/update profile record in profiles table (for on-chain minting audit)
        const { error: profileError } = await supabaseService
            .from('profiles')
            .upsert({
                user_id: userId,
                address: normalizedAddress,
                on_chain: false, // Will be updated to true after successful minting
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (profileError) {
            console.error('Error creating profile record:', profileError);
            // Don't fail - profile record is for audit/indexing
        }

        // 8. Return createProfile payload
        return NextResponse.json({
            success: true,
            message: needsEmailVerification
                ? 'Profile registered. Please verify your email to complete registration.'
                : 'Profile registered successfully!',
            needsEmailVerification,
            contractAddress: PROFILE_NFT_ADDRESS,
            createProfilePayload: {
                name,
                age,
                gender,
                interests,
                photoUrl: finalPhotoUrl,
                email: normalizedEmail,
                photoHash
            },
            userInfo: {
                userId,
                email: normalizedEmail,
                walletAddress: normalizedAddress,
                emailVerified: !needsEmailVerification
            }
        });

    } catch (error) {
        console.error('Error registering profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to register profile' },
            { status: 500 }
        );
    }
}
