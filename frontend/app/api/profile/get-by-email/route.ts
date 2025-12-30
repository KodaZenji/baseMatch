import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

/**
 * POST /api/profile/get-by-email
 * Get profile data by email address from the 'profiles' table.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();


        const { data: profile, error } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        // Check if the profile was found
        if (error || !profile) {
            // Error is often "no rows found" if the profile doesn't exist
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        // Return a sanitized version of the profile data
        return NextResponse.json({
            success: true,
            profile: {
                name: profile.name,
                birthYear: profile.birth_year,
                gender: profile.gender,
                interests: profile.interests,
                photoUrl: profile.photo_url,
                email: profile.email,
                walletAddress: profile.wallet_address,
                emailVerified: profile.email_verified,
                walletVerified: profile.wallet_verified
            }
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}
