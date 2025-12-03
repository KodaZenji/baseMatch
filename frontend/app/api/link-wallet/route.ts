// app/api/link-wallet/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase'; // Assumes you have a service role client imported

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        // 1. Safely parse the JSON request body
        const { profile_id, wallet_address } = await req.json();

        // 2. Validate essential data
        if (!profile_id) {
            console.error('Validation Error: Profile ID is missing in the request body.');
            // Returning a specific error to the client
            return NextResponse.json({ error: 'Profile ID missing. Cannot link wallet.' }, { status: 400 });
        }
        if (!wallet_address) {
            console.error('Validation Error: Wallet address is missing in the request body.');
            return NextResponse.json({ error: 'Wallet address missing. Cannot link wallet.' }, { status: 400 });
        }

        // 3. Update the Supabase profile record
        const { data, error } = await supabaseService
            .from('profiles')
            .update({ 
                wallet_address: wallet_address, 
                wallet_verified: true // <-- THIS IS THE CRITICAL FLAG
            })
            .eq('id', profile_id)
            .select();

        if (error) {
            console.error('Supabase update error in /api/link-wallet:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
        
        if (data && data.length === 0) {
             console.error(`Update failed: No profile found with ID: ${profile_id}`);
             return NextResponse.json({ error: 'Profile not found or already updated.' }, { status: 404 });
        }

        console.log(`Successfully linked wallet ${wallet_address} to profile ID ${profile_id}`);
        
        // 4. Success Response
        return NextResponse.json({ success: true, profile: data[0] });

    } catch (error) {
        console.error('Unexpected error in /api/link-wallet:', error);
        // This often catches JSON parsing errors if the request body is malformed
        return NextResponse.json({ error: 'Internal server error or malformed request.' }, { status: 500 });
    }
}

/*
### Next Action

You must ensure that when you make the client-side fetch call to this endpoint 
after the NFT mint succeeds, you are sending a JSON body that looks like this:

{
  "profile_id": "YOUR_SUPABASE_UUID_HERE",
  "wallet_address": "0x..."
}
*/
