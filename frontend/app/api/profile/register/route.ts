import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature, generateToken, sendVerificationEmail, calculatePhotoHash } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/register
 * Wallet-First Flow: Register profile with wallet signature, trigger email verification if needed
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, name, age, gender, interests, email, photoUrl, signature, message } = body;

        // --- 1. Basic Validation ---
        if (!address || !email || !name || !age || !gender || !interests) {
            return NextResponse.json(
                { error: 'Missing required fields for registration' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();

        // 2. Verify wallet signature
        if (signature && message) {
            const isValidSignature = await verifyWalletSignature(message, signature, normalizedAddress);
            if (!isValidSignature) {
                return NextResponse.json(
                    { error: 'Invalid wallet signature' },
                    { status: 400 }
                );
            }
        }

        // 3. Data Validation
        if (age < 18 || age > 120) {
            return NextResponse.json(
                { error: 'Age must be between 18 and 120' },
                { status: 400 }
            );
        }
        // Assuming other data validations (name length, interests length) are in place...

        // 4. Handle photo upload/hashing
        const finalPhotoUrl = photoUrl || '';
        const photoHash = finalPhotoUrl ? calculatePhotoHash(finalPhotoUrl) : '';

        // 5. User Lookup: Find existing user by email OR wallet
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

        // Check for conflicts (Email linked to a different wallet)
        if (existingUserByEmail && existingUserByWallet && existingUserByEmail.id !== existingUserByWallet.id) {
            return NextResponse.json(
                { error: 'Email is already associated with a different wallet address (Conflict)' },
                { status: 409 }
            );
        }

        const existingUser = existingUserByEmail || existingUserByWallet;

        let userId: string;
        let needsEmailVerification = false;

        // 6. Upsert Logic
        if (existingUser) {
            // User exists - attempt to UPDATE
            const { error: updateError } = await supabaseService
                .from('users')
                .update({
                    wallet_address: normalizedAddress,
                    wallet_verified: true,
                    email: normalizedEmail,
                    name,
                    age,
                    gender,
                    interests,
                    // 🛑 FIX: Use the new, correct Supabase column name
                    profile_photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingUser.id);

            if (updateError) {
                console.error('Error updating existing user:', updateError);
                // 🛑 Improved Error Message
                return NextResponse.json(
                    { error: `Registration failed (Update): ${updateError.message}` },
                    { status: 500 }
                );
            }

            userId = existingUser.id;
            needsEmailVerification = !existingUser.email_verified;
        } else {
            // New user - attempt to CREATE
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
                    // 🛑 FIX: Use the new, correct Supabase column name
                    profile_photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select('id')
                .single();

            if (createError || !newUser) {
                console.error('Error creating new user:', createError);
                // 🛑 Improved Error Message
                return NextResponse.json(
                    { error: `Registration failed (Creation): ${createError?.message || 'Unknown DB error'}` },
                    { status: 500 }
                );
            }

            userId = newUser.id;
            needsEmailVerification = true;
        }

        // 7. Verification Trigger: Send email verification if needed (No changes needed here)
        if (needsEmailVerification) {
            try {
                const token = generateToken();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

                const { error: tokenError } = await supabaseService
                    .from('email_verifications')
                    .insert([{
                        user_id: userId,
                        email: normalizedEmail,
                        token,
                        expires_at: expiresAt.toISOString(),
                        created_at: new Date().toISOString()
                    }]);

                if (!tokenError) {
                    await sendVerificationEmail(normalizedEmail, token);
                }
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
            }
        }

        // 8. Insert/update profile record in profiles table (No changes needed here)
        const { error: profileError } = await supabaseService
            .from('profiles')
            .upsert({
                user_id: userId,
                address: normalizedAddress,
                on_chain: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (profileError) {
            console.error('Error creating profile record:', profileError);
        }

        // 9. Return createProfile payload
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
                // 🚀 CRITICAL FIX: Send the short HASH, NOT the long URL, to the client 
                // for the smart contract call.
                photoUrl: photoHash, 
                email: normalizedEmail,
                photoHash: photoHash
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
            { error: error instanceof Error ? error.message : 'An unknown error occurred during registration' },
            { status: 500 }
        );
    }
}
