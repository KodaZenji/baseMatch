// frontend/app/api/profile/sync/route.ts
// REPLACE your entire file with this updated version

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

/**
 * POST /api/profile/sync
 * Sync profile data to database after blockchain update
 * Called after successful wallet-based profile updates
 * Handles both wallet-based and email-based lookups
 * Creates notification when profile is completed
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            walletAddress,
            name,
            birthYear,
            gender,
            interests,
            photoUrl,
            email
        } = body;

        // Must have either wallet address or email to identify the profile
        if (!walletAddress && !email) {
            return NextResponse.json(
                { error: 'Either wallet address or email is required' },
                { status: 400 }
            );
        }

        // Normalize wallet address to lowercase if provided
        const normalizedAddress = walletAddress ? walletAddress.toLowerCase() : null;
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        // Build query to find existing profile by wallet OR email
        let query = supabaseService
            .from('profiles')
            .select('id');

        if (normalizedAddress) {
            query = query.eq('wallet_address', normalizedAddress);
        } else if (normalizedEmail) {
            query = query.eq('email', normalizedEmail);
        }

        const { data: existingProfile, error: fetchError } = await query.maybeSingle();

        if (fetchError) {
            console.error('Error checking existing profile:', fetchError);
            return NextResponse.json(
                { error: 'Failed to check existing profile', details: fetchError.message },
                { status: 500 }
            );
        }

        let isNewProfile = false;
        let profileData: any;

        if (existingProfile) {
            // Profile exists - UPDATE it using the id
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Only update fields that are provided
            if (normalizedAddress !== null) updateData.wallet_address = normalizedAddress;
            if (name !== undefined) updateData.name = name;
            if (birthYear !== undefined) updateData.birthYear = birthYear;
            if (gender !== undefined) updateData.gender = gender;
            if (interests !== undefined) updateData.interests = interests;
            if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
            if (normalizedEmail !== null) updateData.email = normalizedEmail;

            const { data, error: updateError } = await supabaseService
                .from('profiles')
                .update(updateData)
                .eq('id', existingProfile.id)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update profile', details: updateError.message },
                    { status: 500 }
                );
            }

            console.log('Profile updated successfully:', data);
            profileData = data;
            isNewProfile = false;
        } else {
            // Profile doesn't exist - INSERT new one
            const { data, error: insertError } = await supabaseService
                .from('profiles')
                .insert({
                    wallet_address: normalizedAddress || '',
                    name: name || '',
                    birthYear: birthYear || 0,
                    gender: gender || '',
                    interests: interests || '',
                    photoUrl: photoUrl || '',
                    email: normalizedEmail || '',
                    wallet_verified: !!normalizedAddress,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting profile:', insertError);
                return NextResponse.json(
                    { error: 'Failed to create profile', details: insertError.message },
                    { status: 500 }
                );
            }

            console.log('Profile created successfully:', data);
            profileData = data;
            isNewProfile = true;
        }

        // ============ CREATE PROFILE COMPLETION NOTIFICATION ============
        // Check if profile is complete (has all required fields)
        const isProfileComplete = !!(
            profileData.name &&
            profileData.birthYear &&
            profileData.gender &&
            profileData.interests &&
            (profileData.wallet_address || profileData.email)
        );

        if (isProfileComplete) {
            try {
                const userAddress = profileData.wallet_address || profileData.email;

                await supabaseService
                    .from('notifications')
                    .insert({
                        user_address: userAddress.toLowerCase(),
                        type: 'profile_complete',
                        title: isNewProfile ? '✅ Profile Created!' : '✅ Profile Updated!',
                        message: isNewProfile
                            ? 'Your profile has been successfully created and is now visible to others!'
                            : 'Your profile has been successfully updated!',
                        metadata: {
                            profile_id: profileData.id,
                            is_new: isNewProfile,
                            updated_fields: {
                                name: !!name,
                                birthYear: !!birthYear,
                                gender: !!gender,
                                interests: !!interests,
                                photoUrl: !!photoUrl
                            }
                        }
                    });

                console.log('✅ Profile completion notification created for:', userAddress);
            } catch (notifError) {
                // Don't fail the sync if notification fails
                console.error('Failed to create profile notification:', notifError);
            }
        }

        return NextResponse.json({
            success: true,
            message: isNewProfile ? 'Profile created successfully' : 'Profile updated successfully',
            profile: profileData,
            isNewProfile,
            isComplete: isProfileComplete
        });

    } catch (error) {
        console.error('Error syncing profile:', error);
        return NextResponse.json(
            { error: 'Failed to sync profile' },
            { status: 500 }
        );
    }
}
