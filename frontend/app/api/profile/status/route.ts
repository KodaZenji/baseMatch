// ============================================
// FILE: app/api/profile/status/route.ts
// UPDATED: Check blockchain FIRST, then database
// ============================================
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

        // ✅ STEP 1: Check blockchain FIRST (source of truth)
        console.log('⛓️ Checking blockchain first...');
        const hasMintedNFT = await checkNftOwnership(normalizedAddress);

        if (hasMintedNFT) {
            console.log('✅ NFT found on-chain for:', normalizedAddress);
            
            // Check if database has matching profile
            const { data: profile } = await supabaseService
                .from('profiles')
                .select('id, email_verified, wallet_address')
                .eq('wallet_address', normalizedAddress)
                .maybeSingle();

            if (profile) {
                console.log('✅ Profile synced in database:', profile.id);
                return NextResponse.json({
                    profileExists: true,
                    source: 'blockchain',
                    databaseSynced: true,
                    emailVerified: profile.email_verified,
                    message: 'Profile NFT exists on-chain and synced in database'
                });
            } else {
                console.log('⚠️ NFT exists but not synced in database');
                return NextResponse.json({
                    profileExists: true,
                    source: 'blockchain',
                    databaseSynced: false,
                    message: 'Profile NFT exists on-chain but not synced in database'
                });
            }
        }

        // ✅ STEP 2: No NFT found, check database as fallback
        console.log('📋 No NFT on-chain, checking database...');
        const { data: profile, error: dbError } = await supabaseService
            .from('profiles')
            .select('id, email_verified, wallet_address')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();

        if (dbError) {
            console.error('⚠️ Database error:', dbError);
        }

        if (profile) {
            console.log('✅ Profile found in database (no NFT yet):', profile.id);
            return NextResponse.json({
                profileExists: true,
                source: 'database',
                databaseSynced: true,
                emailVerified: profile.email_verified,
                hasNFT: false,
                message: 'Profile registered in database but NFT not minted yet'
            });
        }

        // ✅ STEP 3: No profile anywhere - new user
        console.log('ℹ️ No profile found anywhere - user can register/mint');
        return NextResponse.json({
            profileExists: false,
            source: 'none',
            hasNFT: false,
            databaseSynced: false,
            message: 'New user - needs to register and mint'
        });

    } catch (error) {
        console.error('❌ Error in profile status API:', error);
        return NextResponse.json(
            { 
                error: 'Failed to check profile status', 
                details: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}
