import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, name, age, gender, interests, email, photoUrl } = body;

        // Validate input
        if (!address || !name || !age || !gender || !interests || !email) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Create profile in Supabase profiles table
        const { data: profile, error: insertError } = await supabaseService
            .from('profiles')
            .insert([
                {
                    address: address.toLowerCase(),
                    name,
                    age,
                    gender,
                    interests,
                    email,
                    photoUrl: photoUrl || '',
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Error creating profile in Supabase:', insertError);
            return NextResponse.json(
                { error: 'Failed to create profile' },
                { status: 500 }
            );
        }

        // Try to sync with Neynar if API key is available
        if (process.env.NEXT_PUBLIC_NEYNAR_API_KEY) {
            try {
                const neynarResponse = await (global.fetch || fetch)(
                    `https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}&api_key=${process.env.NEXT_PUBLIC_NEYNAR_API_KEY}`
                );

                if (neynarResponse.ok) {
                    const neynarData: any = await neynarResponse.json();
                    const neynarUser = neynarData.result?.user;

                    if (neynarUser) {
                        // Update profile with Neynar data
                        await supabaseService
                            .from('profiles')
                            .update({
                                farcaster_username: neynarUser.username,
                                farcaster_fid: neynarUser.fid,
                                farcaster_avatar: neynarUser.pfp_url,
                            })
                            .eq('address', address.toLowerCase());

                        console.log(`Synced Neynar user: ${neynarUser.username} (FID: ${neynarUser.fid})`);
                    }
                }
            } catch (neynarError) {
                console.warn(`Failed to sync with Neynar for ${address}:`, neynarError);
                // Don't fail the whole request if Neynar sync fails
            }
        }

        return NextResponse.json({
            success: true,
            profile,
            message: 'Profile created successfully'
        });
    } catch (error) {
        console.error('Error creating profile:', error);
        return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
        );
    }
}
