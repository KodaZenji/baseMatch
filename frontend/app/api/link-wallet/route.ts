import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase'; 

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { profileId, walletAddress } = await request.json();

        if (!profileId || !walletAddress) {
            return NextResponse.json({ error: 'Missing profile ID or wallet address.' }, { status: 400 });
        }

        // 1. Update the existing profile record
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                wallet_address: walletAddress.toLowerCase(), // Save the address
                wallet_verified: true, // Set verification flag
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId); // Match the existing email-registered profile

        if (updateError) {
            console.error('Database error linking wallet:', updateError);
            return NextResponse.json({ error: 'Failed to update profile in database.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Wallet linked successfully.' });

    } catch (error) {
        console.error('Error in link-wallet API:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
              }
