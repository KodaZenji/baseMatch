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

        // Check if profile exists in profiles table
        const { data: existingProfile } = await supabaseService
            .from('profiles')
            .select('wallet_address')
            .eq('wallet_address', normalizedAddress)
            .single();

        if (existingProfile) {
            // Update existing profile
            const { error: updateError } = await supabaseService
                .from('profiles')
                .update({
                    name: name || undefined,
                    age: age || undefined,
                    gender: gender || undefined,
                    interests: interests || undefined,
                    photoUrl: photoUrl || '',
                    email: email || undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', normalizedAddress);

            if (updateError) {
                console.error('Error updating profile in database:', updateError);
                return NextResponse.json(
                    { error: 'Failed to sync profile to database', details: updateError.message },
                    { status: 500 }
                );
            }
        } else {
            // Insert new profile (shouldn't normally happen, but safe fallback)
            const { error: insertError } = await supabaseService
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
                });

            if (insertError) {
                console.error('Error inserting profile into database:', insertError);
                return NextResponse.json(
                    { error: 'Failed to create profile in database', details: insertError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Profile synced to database successfully'
        });

    } catch (error) {
        console.error('Error syncing profile:', error);
        return NextResponse.json(
            { error: 'Failed to sync profile' },
            { status: 500 }
        );
    }
                  }
