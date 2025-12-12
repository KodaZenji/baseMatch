

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
export const runtime = 'nodejs'; 

export async function GET() {
    try {
        // --- Database Query with Completeness Filters ---
        
        // Based on the profiles table schema, we filter for profiles that have 
        // successfully completed all required steps to be considered 'complete' 
        // and ready for matching.
        const { data: profiles, error } = await supabaseService
            .from('profiles')
            .select('wallet_address, name, age, gender, interests, photoUrl, wallet_verified, email_verified')
            .not('name', 'is', null)           // Profile must have a Name
            .not('wallet_address', 'is', null) // Profile must have a Wallet Address linked
            .eq('wallet_verified', true)       // Wallet verification must be TRUE (final step)
            .eq('email_verified', true);       // Email verification must be TRUE

        if (error) {
            console.error('Supabase fetch error in /api/profiles:', error);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }
        
        console.log(`Profiles sent to frontend: ${profiles.length}`); 

        // Returning the data in the format expected by useProfiles (data.profiles)
        return NextResponse.json({ profiles });
    } catch (error) {
        console.error('Unexpected error in /api/profiles:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
