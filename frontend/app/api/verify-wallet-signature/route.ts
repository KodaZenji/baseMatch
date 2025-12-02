import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { verifyMessage } from 'viem';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, email, message, signature } = body;

        if (!address || !email || !message || !signature) {
            return NextResponse.json(
                { error: 'Address, email, message, and signature are required' },
                { status: 400 }
            );
        }

        try {
            // Verify the signature
            const isValid = await verifyMessage({
                address: address as `0x${string}`,
                message,
                signature: signature as `0x${string}`
            });

            if (!isValid) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 400 }
                );
            }

            // Extract nonce from message
            const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
            const nonce = nonceMatch ? nonceMatch[1] : null;

            if (!nonce) {
                return NextResponse.json(
                    { error: 'Invalid message format' },
                    { status: 400 }
                );
            }

            // Verify nonce exists and hasn't expired
            const { data: verification, error: queryError } = await supabaseService
                .from('wallet_verifications')
                .select('*')
                .eq('token', nonce)
                .eq('wallet_address', address.toLowerCase())
                .eq('email', email.toLowerCase().trim())
                .single();

            if (queryError || !verification) {
                return NextResponse.json(
                    { error: 'Invalid or expired verification request' },
                    { status: 400 }
                );
            }

            // Check if nonce has expired
            if (new Date(verification.expires_at) < new Date()) {
                return NextResponse.json(
                    { error: 'Signature request expired' },
                    { status: 400 }
                );
            }

            // Find or create user
            const { data: user, error: userError } = await supabaseService
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .single();

            let userId = user?.id;
            if (!user || userError) {
                // Create user if doesn't exist
                const { data: newUser, error: createError } = await supabaseService
                    .from('users')
                    .insert([{
                        email: email.toLowerCase().trim(),
                        email_verified: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError || !newUser) {
                    console.error('Error creating user:', createError);
                    return NextResponse.json(
                        { error: 'Failed to create user account' },
                        { status: 500 }
                    );
                }
                userId = newUser.id;
            }

            // Update user_verifications with wallet verification
            const { error: verifyError } = await supabaseService
                .from('user_verifications')
                .upsert({
                    user_id: userId,
                    wallet_verified: true,
                    wallet_address: address.toLowerCase(),
                    wallet_verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (verifyError) {
                console.error('Error updating wallet verification:', verifyError);
                return NextResponse.json(
                    { error: 'Failed to verify wallet' },
                    { status: 500 }
                );
            }

            // Delete the used nonce
            await supabaseService
                .from('wallet_verifications')
                .delete()
                .eq('token', nonce);

            return NextResponse.json({
                success: true,
                message: 'Wallet verified successfully!',
                userId
            });
        } catch (signatureError) {
            console.error('Signature verification error:', signatureError);
            return NextResponse.json(
                { error: 'Failed to verify signature' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error verifying signature:', error);
        return NextResponse.json(
            { error: 'Failed to process verification' },
            { status: 500 }
        );
    }
}
