// frontend/app/api/profile/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

/**
 * POST /api/profile/sync
 * Sync profile data to database after blockchain update
 * Called after successful wallet-based profile updates
 * Handles both wallet-based and email-based lookups
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            walletAddress, 
            name, 
            age, 
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

        if (existingProfile) {
            // Profile exists - UPDATE it using the id
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Only update fields that are provided
            if (normalizedAddress !== null) updateData.wallet_address = normalizedAddress;
            if (name !== undefined) updateData.name = name;
            if (age !== undefined) updateData.age = age;
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

            return NextResponse.json({
                success: true,
                message: 'Profile updated successfully',
                profile: data
            });
        } else {
            // Profile doesn't exist - INSERT new one
            const { data, error: insertError } = await supabaseService
                .from('profiles')
                .insert({
                    wallet_address: normalizedAddress || '',
                    name: name || '',
                    age: age || 0,
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

            return NextResponse.json({
                success: true,
                message: 'Profile created successfully',
                profile: data
            });
        }

    } catch (error) {
        console.error('Error syncing profile:', error);
        return NextResponse.json(
            { error: 'Failed to sync profile' },
            { status: 500 }
        );
    }
}
