import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/register
 * Supports TWO flows:
 * 1. Wallet-only registration (no email)
 * 2. Wallet + Email registration
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, name, age, gender, interests, email, photoUrl, signature, message } = body;

        console.log('📥 Registration request:', {
            hasAddress: !!address,
            hasName: !!name,
            hasAge: !!age,
            hasGender: !!gender,
            hasInterests: !!interests,
            hasEmail: !!email,
            hasSignature: !!signature,
        });

        // --- 1. Basic Validation (email is now OPTIONAL) ---
        if (!address || !name || !age || !gender || !interests) {
            return NextResponse.json(
                { error: 'Missing required fields: address, name, age, gender, interests' },
                { status: 400 }
            );
        }

        // Normalize inputs
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedAddress = address.toLowerCase();

        // 2. Verify wallet signature (Only runs if signature/message are provided)
        if (signature && message) {
            console.log('🔐 Verifying wallet signature...');
            const isValidSignature = await verifyWalletSignature(message, signature, normalizedAddress);
            if (!isValidSignature) {
                return NextResponse.json(
                    { error: 'Invalid wallet signature' },
                    { status: 400 }
                );
            }
            console.log('✅ Signature verified');
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
                { error: 'Photo URL too long. Maximum 500 characters.' },
                { status: 400 }
            );
        }

        // 5. Profile Lookup
        let existingProfile = null;

        // Check by wallet first (always required)
        const { data: existingProfileByWallet } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();

        // If email provided, check for conflicts
        if (normalizedEmail) {
            const { data: existingProfileByEmail } = await supabaseService
                .from('profiles')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();

            // Check for conflicts (Email linked to a different wallet)
            if (existingProfileByEmail && existingProfileByWallet && existingProfileByEmail.id !== existingProfileByWallet.id) {
                return NextResponse.json(
                    { error: 'Email is already associated with a different wallet address' },
                    { status: 409 }
                );
            }

            existingProfile = existingProfileByEmail || existingProfileByWallet;
        } else {
            existingProfile = existingProfileByWallet;
        }

        let profileId: string;
        let needsEmailVerification = false;

        // 6. Upsert Logic
        if (existingProfile) {
            console.log('📝 Updating existing profile:', existingProfile.id);
            
            // Profile exists - UPDATE
            const updateData: any = {
                wallet_address: normalizedAddress,
                wallet_verified: true,
                name,
                age,
                gender,
                interests,
                updated_at: new Date().toISOString()
            };

            // Only update email if provided
            if (normalizedEmail) {
                updateData.email = normalizedEmail;
            }

            // Only include photoUrl if provided
            if (photoUrl) {
                updateData.photoUrl = photoUrl;
            }

            const { error: updateError } = await supabaseService
                .from('profiles')
                .update(updateData)
                .eq('id', existingProfile.id);

            if (updateError) {
                console.error('❌ Error updating profile:', updateError);
                return NextResponse.json(
                    { error: `Registration failed: ${updateError.message}` },
                    { status: 500 }
                );
            }

            profileId = existingProfile.id;
            needsEmailVerification = normalizedEmail && !existingProfile.email_verified;
        } else {
            console.log('✨ Creating new profile');
            
            // New profile - CREATE
            const insertData: any = {
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

            // Only include email if provided
            if (normalizedEmail) {
                insertData.email = normalizedEmail;
            }

            // Only include photoUrl if provided
            if (photoUrl) {
                insertData.photoUrl = photoUrl;
            }

            const { data: newProfile, error: createError } = await supabaseService
                .from('profiles')
                .insert([insertData])
                .select('id')
                .single();

            if (createError || !newProfile) {
                console.error('❌ Error creating profile:', createError);
                return NextResponse.json(
                    { error: `Registration failed: ${createError?.message || 'Unknown error'}` },
                    { status: 500 }
                );
            }

            profileId = newProfile.id;
            needsEmailVerification = !!normalizedEmail; // Only needs verification if email was provided
        }

        // 7. Send verification email if needed
        if (needsEmailVerification && normalizedEmail) {
            console.log('📧 Sending verification email...');
            try {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/register-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: normalizedEmail,
                        walletAddress: normalizedAddress,
                        name,
                        age,
                        gender,
                        interests,
                        skipPhotoUpload: true
                    })
                });
            } catch (emailError) {
                console.error('⚠️ Error sending verification email:', emailError);
                // Don't fail the registration if email sending fails
            }
        }

        console.log('✅ Registration successful:', { profileId, needsEmailVerification });

        // 8. Return success response
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
                photoUrl: photoUrl || '',
                email: normalizedEmail || ''
            },
            userInfo: {
                profileId,
                email: normalizedEmail,
                walletAddress: normalizedAddress,
                emailVerified: !needsEmailVerification
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Registration failed' },
            { status: 500 }
        );
    }
}
