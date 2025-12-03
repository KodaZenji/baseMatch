import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyWalletSignature, generateToken, sendVerificationEmail, calculatePhotoHash } from '@/lib/utils'; // Assumed to be imported

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

        // 2. Verify wallet signature (Only runs if signature/message are provided)
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

        // 4. Handle photo upload/hashing
        const finalPhotoUrl = photoUrl || '';
        const photoHash = finalPhotoUrl ? calculatePhotoHash(finalPhotoUrl) : '';

        // 5. Profile Lookup: Find existing profile by email OR wallet
        // 🛑 FIX 1: Use 'profiles' table
        const { data: existingProfileByEmail } = await supabaseService
            .from('profiles') 
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        // 🛑 FIX 2: Use 'profiles' table
        const { data: existingProfileByWallet } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .single();

        // Check for conflicts (Email linked to a different wallet)
        if (existingProfileByEmail && existingProfileByWallet && existingProfileByEmail.id !== existingProfileByWallet.id) {
            return NextResponse.json(
                { error: 'Email is already associated with a different wallet address (Conflict)' },
                { status: 409 }
            );
        }

        const existingProfile = existingProfileByEmail || existingProfileByWallet;

        let profileId: string; // 🛑 Renamed from userId to profileId
        let needsEmailVerification = false;

        // 6. Upsert Logic
        if (existingProfile) {
            // Profile exists - attempt to UPDATE
            // 🛑 FIX 3: Use 'profiles' table
            const { error: updateError } = await supabaseService
                .from('profiles')
                .update({
                    wallet_address: normalizedAddress,
                    wallet_verified: true,
                    email: normalizedEmail,
                    name,
                    age,
                    gender,
                    interests,
                    profile_photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingProfile.id);

            if (updateError) {
                console.error('Error updating existing profile:', updateError);
                return NextResponse.json(
                    { error: `Registration failed (Update): ${updateError.message}` },
                    { status: 500 }
                );
            }

            profileId = existingProfile.id; // 🛑 Use profileId
            needsEmailVerification = !existingProfile.email_verified;
        } else {
            // New profile - attempt to CREATE
            // 🛑 FIX 4: Use 'profiles' table
            const { data: newProfile, error: createError } = await supabaseService
                .from('profiles')
                .insert([{
                    email: normalizedEmail,
                    wallet_address: normalizedAddress,
                    wallet_verified: true,
                    email_verified: false,
                    name,
                    age,
                    gender,
                    interests,
                    profile_photo_url: finalPhotoUrl,
                    photo_hash: photoHash,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select('id')
                .single();

            if (createError || !newProfile) {
                console.error('Error creating new profile:', createError);
                return NextResponse.json(
                    { error: `Registration failed (Creation): ${createError?.message || 'Unknown DB error'}` },
                    { status: 500 }
                );
            }

            profileId = newProfile.id; // 🛑 Use profileId
            needsEmailVerification = true;
        }

        // 7. Verification Trigger: Send email verification if needed
        if (needsEmailVerification) {
            try {
                const token = generateToken();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

                const { error: tokenError } = await supabaseService
                    .from('email_verifications')
                    .insert([{
                        user_id: profileId, // Pass profileId as user_id for the token table
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

        // 🛑 REMOVED STEP 8: The separate upsert to 'profiles' is now redundant 
        // as the primary upsert in step 6 now targets the 'profiles' table.

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
                photoUrl: photoHash, 
                email: normalizedEmail,
                photoHash: photoHash
            },
            userInfo: {
                profileId, // 🛑 Use profileId
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
