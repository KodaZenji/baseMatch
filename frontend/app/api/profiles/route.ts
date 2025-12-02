import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

export async function GET(request: NextRequest) {
    try {
        // Fetch all profiles from Supabase that exist on blockchain
        const { data: supabaseProfiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !supabaseProfiles) {
            return NextResponse.json({ profiles: [] });
        }

        // Verify each profile on-chain and with Neynar
        const verifiedProfiles = [];

        for (const profile of supabaseProfiles) {
            try {
                // Verify profile exists on blockchain
                const blockchainProfile = await publicClient.readContract({
                    address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                    abi: PROFILE_NFT_ABI,
                    functionName: 'getProfile',
                    args: [profile.address as `0x${string}`],
                });

                if (!(blockchainProfile as any).exists) {
                    continue; // Skip if not on blockchain
                }

                // Try to verify with Neynar if API key available
                let neynarUser = null;
                let neynarVerified = false;
                if (NEYNAR_API_KEY) {
                    try {
                        const neynarResponse = await fetch(
                            `https://api.neynar.com/v2/farcaster/user/by_verification?address=${profile.address}&api_key=${NEYNAR_API_KEY}`
                        );
                        if (neynarResponse.ok) {
                            const neynarData = await neynarResponse.json();
                            neynarUser = neynarData.result?.user;
                            neynarVerified = true;
                        }
                    } catch (err) {
                        console.warn(`Failed to verify ${profile.address} with Neynar:`, err);
                    }
                }

                // Include profile regardless of Neynar verification
                // But mark if Neynar verified
                verifiedProfiles.push({
                    ...profile,
                    verified: {
                        blockchain: true,
                        neynar: neynarVerified,
                        neynarUsername: neynarUser?.username,
                        neynarAvatar: neynarUser?.pfp_url,
                    },
                });

                // Cache Neynar verification if successful
                if (neynarVerified && neynarUser) {
                    try {
                        if (profile.email) {
                            const { data: userRow } = await supabase
                                .from('users')
                                .select('id')
                                .eq('email', profile.email)
                                .single();
                            if (userRow?.id) {
                                await supabase
                                    .from('user_verifications')
                                    .upsert([
                                        {
                                            user_id: userRow.id,
                                            wallet_verified: true,
                                            wallet_verified_at: new Date().toISOString(),
                                            wallet_address: profile.address,
                                            updated_at: new Date().toISOString()
                                        }
                                    ], { onConflict: 'user_id' });
                            }
                        }
                    } catch (cacheErr) {
                        console.warn('Failed to cache Neynar verification:', cacheErr);
                    }
                }
            } catch (err) {
                console.warn(`Failed to verify profile ${profile.address}:`, err);
            }
        }

        return NextResponse.json({ profiles: verifiedProfiles });
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return NextResponse.json({ profiles: [] });
    }
}
