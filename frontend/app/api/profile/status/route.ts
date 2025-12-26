import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { checkNftOwnership } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        const normalizedAddress = address.toLowerCase();
        console.log('🔍 Checking profile status for:', normalizedAddress);

        // ✅ FIX: Use .maybeSingle() instead of .single() to avoid errors
        const { data: profile, error: dbError } = await supabaseService
            .from('profiles')
            .select('id, email_verified, wallet_address')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();

        // Log any actual database errors (not "no rows found")
        if (dbError) {
            console.error('⚠️ Database error:', dbError);
        }

        if (profile) {
            console.log('✅ Profile found in Supabase:', profile.id);
            return NextResponse.json({
                profileExists: true,
                source: 'database',
                emailVerified: profile.email_verified,
                message: 'Profile data found in database'
            });
        }

        console.log('📋 No profile in database, checking blockchain...');

        // Check On-Chain NFT Ownership
        const hasMintedNFT = await checkNftOwnership(normalizedAddress);

        if (hasMintedNFT) {
            console.log('✅ NFT found on-chain for:', normalizedAddress);
            return NextResponse.json({
                profileExists: true,
                source: 'blockchain',
                message: 'Profile NFT already owned'
            });
        }

        console.log('ℹ️ No profile found - user can register/mint');
        return NextResponse.json({
            profileExists: false,
            message: 'New user - needs to register and mint'
        });

    } catch (error) {
        console.error('❌ Error in profile status API:', error);
        return NextResponse.json(
            { error: 'Failed to check profile status', details: error.message },
            { status: 500 }
        );
    }
}
