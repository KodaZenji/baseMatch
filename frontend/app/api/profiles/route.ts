// frontend/app/api/profiles/route.ts
// Fetch only verified profiles with no caching

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // ✅ Disable Next.js caching
export const revalidate = 0; // ✅ Don't cache at all

/**
 * GET /api/profiles
 * Returns only COMPLETE profiles ready for discovery:
 * - Must have name
 * - Must have wallet_address
 * - Must have wallet_verified = true
 * - Must have email_verified = true
 * 
 * This ensures only fully verified users appear on the discovery page
 */
export async function GET() {
    try {
        console.log('📋 Fetching verified profiles from database...');

        // --- Database Query with Completeness Filters ---
        // Based on the profiles table schema, we filter for profiles that have 
        // successfully completed all required steps to be considered 'complete' 
        // and ready for matching.
        const { data: profiles, error } = await supabaseService
            .from('profiles')
            .select('wallet_address, name, birthYear, gender, interests, photoUrl, wallet_verified, email_verified')
            .not('name', 'is', null)           // Profile must have a Name
            .not('wallet_address', 'is', null) // Profile must have a Wallet Address linked
            .eq('wallet_verified', true)       // Wallet verification must be TRUE (final step)
            .eq('email_verified', true);       // Email verification must be TRUE

        if (error) {
            console.error('❌ Supabase fetch error in /api/profiles:', error);
            return NextResponse.json(
                { error: 'Database query failed', details: error.message },
                { status: 500 }
            );
        }

        console.log(`✅ Profiles sent to frontend: ${profiles?.length || 0}`);

        // ✅ Log sample photoUrls for debugging (first 3 profiles)
        if (profiles && profiles.length > 0) {
            console.log('📸 Sample verified profiles:', profiles.slice(0, 3).map(p => ({
                name: p.name,
                photoUrl: p.photoUrl,
                wallet_verified: p.wallet_verified,
                email_verified: p.email_verified
            })));
        }

        // Returning the data in the format expected by useProfiles (data.profiles)
        return NextResponse.json(
            {
                profiles: profiles || [],
                timestamp: new Date().toISOString() // ✅ For debugging cache issues
            },
            {
                status: 200,
                headers: {
                    // ✅ Prevent all caching to ensure fresh photoUrls
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store'
                }
            }
        );
    } catch (error) {
        console.error('❌ Unexpected error in /api/profiles:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
