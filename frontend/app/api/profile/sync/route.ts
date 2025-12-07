// frontend/app/api/profile/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

/**
 * POST /api/profile/sync
 * Sync profile data to database after blockchain update
 * Called after successful wallet-based profile updates
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

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        // Normalize wallet address
        const normalizedAddress = walletAddress.toLowerCase();

        // First, check if profile exists
        const { data: existingProfile, error: fetchError } = await supabaseService
            .from('profiles')
            .select('id, wallet_address')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors if not found

        if (fetchError) {
            console.error('Error checking existing profile:', fetchError);
            return NextResponse.json(
                { error: 'Failed to check existing profile', details: fetchError.message },
                { status: 500 }
            );
        }

        if (existingProfile) {
            // Profile exists - UPDATE it using the id
            const { data, error: updateError } = await supabaseService
                .from('profiles')
                .update({
                    name: name || existingProfile.name,
                    age: age || existingProfile.age,
                    gender: gender || existingProfile.gender,
                    interests: interests || existingProfile.interests,
                    photoUrl: photoUrl !== undefined ? photoUrl : existingProfile.photoUrl,
                    email: email || existingProfile.email,
                    updated_at: new Date().toISOString()
                })
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
                    wallet_address: normalizedAddress,
                    name: name || '',
                    age: age || 0,
                    gender: gender || '',
                    interests: interests || '',
                    photoUrl: photoUrl || '',
                    email: email || '',
                    wallet_verified: true,
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
