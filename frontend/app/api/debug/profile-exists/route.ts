import { NextRequest, NextResponse } from 'next/server';
import { CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

/**

 * GET /api/debug/profile-exists?address=0x...
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json(
                { error: 'Address parameter required' },
                { status: 400 }
            );
        }

        const normalizedAddress = address.toLowerCase() as `0x${string}`;

        console.log(`\n📋 DEBUG: Checking profile for ${normalizedAddress}`);

        // 1. Check profileExists()
        console.log('🔍 Calling profileExists()...');
        const profileExistsResult = await publicClient.readContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI,
            functionName: 'profileExists',
            args: [normalizedAddress],
        });
        console.log('✅ profileExists result:', profileExistsResult);

        // 2. Get full profile data
        console.log('🔍 Calling getProfile()...');
        const profileData = await publicClient.readContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI,
            functionName: 'getProfile',
            args: [normalizedAddress],
        });
        console.log('✅ getProfile result:', profileData);

        // 3. Check NFT balance
        const PROFILE_NFT_ABI_MINIMAL = [
            {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ type: 'address', name: 'owner' }],
                outputs: [{ type: 'uint256', name: '' }],
            },
        ] as const;

        console.log('🔍 Calling balanceOf()...');
        const balance = await publicClient.readContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI_MINIMAL,
            functionName: 'balanceOf',
            args: [normalizedAddress],
        });
        console.log('✅ balanceOf result:', balance);

        return NextResponse.json({
            address: normalizedAddress,
            profileExists: profileExistsResult,
            profile: {
                tokenId: (profileData as any).tokenId?.toString() || '0',
                name: (profileData as any).name || '',
                birthYear: (profileData as any).birthYear || 0,
                gender: (profileData as any).gender || '',
                interests: (profileData as any).interests || '',
                photoUrl: (profileData as any).photoUrl || '',
                email: (profileData as any).email || '',
                exists: (profileData as any).exists || false,
            },
            nftBalance: balance?.toString() || '0',
            summary: {
                canMatch: profileExistsResult === true,
                message: profileExistsResult
                    ? '✅ Profile exists! Can express interest and match.'
                    : '❌ Profile does NOT exist on-chain. Minting may have failed.',
            },
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        return NextResponse.json(
            {
                error: 'Failed to check profile',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
