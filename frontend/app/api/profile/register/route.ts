import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/register
 * Wallet-First Flow: Register profile with wallet signature, trigger email verification if needed
 * 
 * IMPORTANT: photoUrl must be a SHORT URL (max 500 chars for on-chain storage)
 * - Use Dicebear avatars: https://api.dicebear.com/7.x/pixel-art/svg?seed=xyz
 * - Or upload to IPFS/Supabase Storage and pass the URL
 * - DO NOT pass base64 images directly - they're too long for on-chain storage
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

        // 4. Validate photoUrl length for on-chain storage
        if (photoUrl && photoUrl.length > 500) {
            return NextResponse.json(
                { error: 'Photo URL too long. Maximum 500 characters. Please upload to IPFS or use a short URL.' },
                { status: 400 }
            );
        }

        // 5. Profile Lookup: Find existing profile by email OR wallet
        const { data: existingProfileByEmail } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

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

        let profileId: string;
        let needsEmailVerification = false;

        // 6. Upsert Logic - Store photoUrl in database
        if (existingProfile) {
            // Profile exists - attempt to UPDATE
            const updateData: any = {
                wallet_address: normalizedAddress,
                wallet_verified: true,
                email: normalizedEmail,
                name,
                age,
                gender,
                interests,
                updated_at: new Date().toISOString()
            };

            // Only include photoUrl if provided (and it's short enough)
            if (photoUrl) {
                updateData.photoUrl = photoUrl;
            }

            const { error: updateError } = await supabaseService
                .from('profiles')
                .update(updateData)
                .eq('id', existingProfile.id);

            if (updateError) {
                console.error('Error updating existing profile:', updateError);
                return NextResponse.json(
                    { error: `Registration failed (Update): ${updateError.message}` },
                    { status: 500 }
                );
            }

            profileId = existingProfile.id;
            needsEmailVerification = !existingProfile.email_verified;
        } else {
            // New profile - attempt to CREATE
            const insertData: any = {
                email: normalizedEmail,
                wallet_address: normalizedAddress,
                wallet_verified: true,
                email_verified: false,
                name,
                age,
                gender,
                interests,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Only include photoUrl if provided (and it's short enough)
            if (photoUrl) {
                insertData.photoUrl = photoUrl;
            }

            const { data: newProfile, error: createError } = await supabaseService
                .from('profiles')
                .insert([insertData])
                .select('id')
                .single();

            if (createError || !newProfile) {
                console.error('Error creating new profile:', createError);
                return NextResponse.json(
                    { error: `Registration failed (Creation): ${createError?.message || 'Unknown DB error'}` },
                    { status: 500 }
                );
            }

            profileId = newProfile.id;
            needsEmailVerification = true;
        }

        // 7. Verification Trigger: Send 6-digit code if needed
        if (needsEmailVerification) {
            try {
                // Call the register-email endpoint to send 6-digit code
                // This will handle creating the verification code and sending the email
                const registerEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/register-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: normalizedEmail,
                        walletAddress: normalizedAddress,
                        name,
                        age,
                        gender,
                        interests,
                        skipPhotoUpload: true // Since photo is already handled in this flow
                    })
                });

                if (!registerEmailResponse.ok) {
                    const errorData = await registerEmailResponse.json();
                    console.error('Error sending verification code:', errorData);
                }
            } catch (emailError) {
                console.error('Error triggering verification code:', emailError);
            }
        }

        // 8. Return createProfile payload for on-chain minting
        // The contract expects photoUrl to be max 500 characters
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
                photoUrl: photoUrl || '', // This will be sent to the smart contract
                email: normalizedEmail
            },
            userInfo: {
                profileId,
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
