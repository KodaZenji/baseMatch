import { NextRequest, NextResponse } from 'next/server';
import { CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { supabaseService } from '@/lib/supabase.server';

const publicClient = createPublicClient({
    chain: base,
    transport: http('https://base-mainnet.g.alchemy.com/v2/eij573azum6O085qLp7TD'),
});

/**
 * GET - Fetch profile from blockchain AND database
 * Merges blockchain data with database-only fields (like email)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address || !address.startsWith('0x') || address.length !== 42) {
            return NextResponse.json(
                { error: 'Invalid address format' },
                { status: 400 }
            );
        }

        const normalizedAddress = address.toLowerCase();

        // Fetch blockchain data
        const profileData = await publicClient.readContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI,
            functionName: 'getProfile',
            args: [address as `0x${string}`],
        });

        // Transform blockchain data
        const blockchainProfile = {
            tokenId: (profileData as any).tokenId?.toString() || '0',
            name: (profileData as any).name || '',
            age: (profileData as any).age || 0,
            gender: (profileData as any).gender || '',
            interests: (profileData as any).interests || '',
            photoUrl: (profileData as any).photoUrl || '',
            exists: (profileData as any).exists || false,
        };

        
        const { data: dbProfile, error: dbError } = await supabaseService
            .from('profiles')
            .select('email, email_verified, updated_at')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') {
            console.error('Error fetching database profile:', dbError);
        }

        // Merge blockchain and database data
        // Database email takes precedence over blockchain
        const mergedProfile = {
            ...blockchainProfile,
            email: dbProfile?.email || (profileData as any).email || '',
            email_verified: dbProfile?.email_verified || false,
            wallet_address: normalizedAddress,
        };

        return NextResponse.json(mergedProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile data' },
            { status: 500 }
        );
    }
}

/**
 * POST - Update profile in database
 * For fields that don't need blockchain (email, preferences, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet_address, email, name, age, gender, interests } = body;

        if (!wallet_address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        const normalizedAddress = wallet_address.toLowerCase();
        const normalizedEmail = email?.toLowerCase().trim();

        // Check if profile exists
        const { data: existingProfile } = await supabaseService
            .from('profiles')
            .select('id, email')
            .eq('wallet_address', normalizedAddress)
            .maybeSingle();

        // Prepare update data
        const updateData: any = {
            wallet_address: normalizedAddress,
            updated_at: new Date().toISOString(),
        };

        // Update fields if provided
        if (normalizedEmail !== undefined) {
            updateData.email = normalizedEmail;
            // Reset verification if email changed
            if (existingProfile && normalizedEmail !== existingProfile.email) {
                updateData.email_verified = false;
            }
        }
        if (name !== undefined) updateData.name = name;
        if (age !== undefined) updateData.age = age;
        if (gender !== undefined) updateData.gender = gender;
        if (interests !== undefined) updateData.interests = interests;

        // Upsert profile
        const { data: updatedProfile, error: upsertError } = await supabaseService
            .from('profiles')
            .upsert(updateData, {
                onConflict: 'wallet_address',
            })
            .select()
            .single();

        if (upsertError) {
            console.error('Error updating profile:', upsertError);
            return NextResponse.json(
                { error: 'Failed to update profile', details: upsertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            profile: updatedProfile,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
