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

        // If email is provided, also update user_verifications with wallet address
        if (email) {
            try {
                // Find user by email
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email.toLowerCase().trim())
                    .single();

                if (user?.id) {
                    // Update user_verifications with wallet address and mark wallet as verified
                    await supabase
                        .from('user_verifications')
                        .upsert({
                            user_id: user.id,
                            wallet_verified: true,
                            wallet_address: address.toLowerCase(),
                            wallet_verified_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' });
                }
            } catch (verifyErr) {
                console.warn('Error updating wallet verification:', verifyErr);
                // Don't fail the profile registration if verification update fails
            }
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
