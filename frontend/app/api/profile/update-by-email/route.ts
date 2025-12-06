import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { calculatePhotoHash } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/profile/update-by-email
 * Update user profile for email-first users (before NFT minting)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, age, gender, interests, photoUrl } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Validate data
        if (!name || !age || !gender || !interests) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (age < 18 || age > 120) {
            return NextResponse.json(
                { error: 'Age must be between 18 and 120' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const photoHash = photoUrl ? calculatePhotoHash(photoUrl) : '';

        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                name,
                age,
                gender,
                interests,
                photo_url: photoUrl || '',
                photo_hash: photoHash,
                updated_at: new Date().toISOString()
            })
            .eq('email', normalizedEmail);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json(
                { error: 'Failed to update profile', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
