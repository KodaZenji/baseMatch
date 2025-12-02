import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/profile/get-by-email
 * Get user profile data by email address
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

        const { data: user, error } = await supabaseService
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            profile: {
                name: user.name,
                age: user.age,
                gender: user.gender,
                interests: user.interests,
                photoUrl: user.photo_url,
                email: user.email,
                walletAddress: user.wallet_address,
                emailVerified: user.email_verified,
                walletVerified: user.wallet_verified
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
