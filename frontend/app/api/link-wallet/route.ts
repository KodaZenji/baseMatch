import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase'; 

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { profileId, walletAddress } = await request.json();

        // Enhanced logging
        console.log('🔍 Link-Wallet API Called:', { 
            profileId, 
            walletAddress,
            timestamp: new Date().toISOString() 
        });

        // Validation
        if (!profileId || !walletAddress) {
            console.error('❌ Missing required fields:', { profileId, walletAddress });
            return NextResponse.json({ 
                error: 'Missing profile ID or wallet address.',
                received: { profileId: !!profileId, walletAddress: !!walletAddress }
            }, { status: 400 });
        }

        // Check if profile exists first
        const { data: existingProfile, error: fetchError } = await supabaseService
            .from('profiles')
            .select('id, email, wallet_address, wallet_verified')
            .eq('id', profileId)
            .single();

        if (fetchError || !existingProfile) {
            console.error('❌ Profile not found:', { profileId, fetchError });
            return NextResponse.json({ 
                error: 'Profile not found in database.',
                profileId 
            }, { status: 404 });
        }

        console.log('✅ Found existing profile:', existingProfile);

        // Update the profile
        const { data: updatedData, error: updateError } = await supabaseService
            .from('profiles')
            .update({
                wallet_address: walletAddress.toLowerCase(),
                wallet_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId)
            .select();

        if (updateError) {
            console.error('❌ Database update error:', updateError);
            return NextResponse.json({ 
                error: 'Failed to update profile in database.',
                details: updateError.message 
            }, { status: 500 });
        }

        console.log('✅ Profile updated successfully:', updatedData);

        return NextResponse.json({ 
            success: true, 
            message: 'Wallet linked successfully.',
            profile: updatedData?.[0]
        });

    } catch (error) {
        console.error('❌ Unexpected error in link-wallet API:', error);
        return NextResponse.json({ 
            error: 'Internal server error.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
