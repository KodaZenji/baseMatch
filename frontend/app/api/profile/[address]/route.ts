import { NextResponse, NextRequest } from 'next/server';
import { CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Create a public client to interact with the blockchain
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    try {
        const { address } = await params;

        // Validate address format
        if (!address || !address.startsWith('0x') || address.length !== 42) {
            return NextResponse.json(
                { error: 'Invalid address format' },
                { status: 400 }
            );
        }

        // Fetch profile data from the contract
        const profileData = await publicClient.readContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI,
            functionName: 'getProfile',
            args: [address as `0x${string}`],
        });

        const profile = {
            tokenId: (profileData as any).tokenId?.toString() || '0',
            name: (profileData as any).name || '',
            age: (profileData as any).age || 0,
            gender: (profileData as any).gender || '',
            interests: (profileData as any).interests || '',
            photoUrl: (profileData as any).photoUrl || '',
            email: (profileData as any).email || '',
            exists: (profileData as any).exists || false,
        };

        // Return the profile data
        return NextResponse.json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile data' },
            { status: 500 }
        );
    }
}