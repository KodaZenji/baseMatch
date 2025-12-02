import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, name, age, gender, interests, email, photoUrl } = body;

        if (!address) {
            return NextResponse.json(
                { error: 'Address is required' },
                { status: 400 }
            );
        }

        // Normalize email to lowercase (must match contract)
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        // Insert profile into Supabase for discovery
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                address: address.toLowerCase(),
                name: name || '',
                age: age || 0,
                gender: gender || '',
                interests: interests || '',
                email: normalizedEmail,
                photoUrl: photoUrl || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'address' });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                { error: `Failed to register profile: ${error.message}` },
                { status: 500 }
            );
        }

        // Update user_verifications with wallet address (mark as wallet-verified on-chain)
        try {
            let userId: string | null = null;

            // If email is provided, find user by email
            if (normalizedEmail) {
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', normalizedEmail)
                    .single();

                if (!userError && user?.id) {
                    userId = user.id;
                    console.log('Found user by email:', userId);
                }
            }

            // Ensure we have a user record (create if needed for wallet-only users)
            if (!userId) {
                console.log('Creating user record for wallet address:', address);
                const { data: newUser, error: createUserError } = await supabase
                    .from('users')
                    .insert([
                        {
                            email: normalizedEmail || `wallet_${address.toLowerCase()}@basematch.local`,
                            name: name || '',
                            age: age || 0,
                            gender: gender || '',
                            interests: interests || '',
                        }
                    ])
                    .select('id')
                    .single();

                if (!createUserError && newUser?.id) {
                    userId = newUser.id;
                    console.log('Created user:', userId);
                } else {
                    console.warn('Error creating user:', createUserError);
                }
            }

            // Update user_verifications with wallet address
            if (userId) {
                const { error: updateError } = await supabase
                    .from('user_verifications')
                    .upsert({
                        user_id: userId,
                        wallet_verified: true,
                        wallet_address: address.toLowerCase(),
                        wallet_verified_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });

                if (updateError) {
                    console.error('Error updating wallet verification:', updateError);
                } else {
                    console.log('Updated wallet verification for user:', userId);
                }
            }
        } catch (verifyErr) {
            console.error('Error in wallet verification process:', verifyErr);
            // Don't fail the profile registration if verification update fails
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error registering profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to register profile' },
            { status: 500 }
        );
    }
}
