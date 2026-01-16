// app/api/check-baseapp/route.ts - 

import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Base Name Resolver contract address
const L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

// ABI for reverse lookup (address to basename)
const REVERSE_RESOLVER_ABI = [
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'getNames',
    outputs: [{ name: '', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ exists: false, error: 'Address required' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
      console.warn('ALCHEMY_RPC_URL not configured');
      return NextResponse.json({ exists: false });
    }

    // Create Base mainnet client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
    });

    try {
      // Look up basename(s) for this address
      const names = await publicClient.readContract({
        address: L2_RESOLVER_ADDRESS,
        abi: REVERSE_RESOLVER_ABI,
        functionName: 'getNames',
        args: [address as `0x${string}`],
      });

      if (names && names.length > 0) {
        const primaryName = names[0]; // First basename is usually primary

        // Fetch profile data from base.app (if available)
        let profileData = null;
        try {
          const username = primaryName.replace('.base.eth', '');
          const profileResponse = await fetch(`https://base.app/api/profile/${username}`, {
            headers: { 'Accept': 'application/json' },
          });
          
          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          }
        } catch (error) {
          console.log('Could not fetch Base App profile data:', error);
        }

        return NextResponse.json({
          exists: true,
          profile: {
            basename: primaryName,
            username: primaryName.replace('.base.eth', ''),
            displayName: profileData?.displayName || primaryName.replace('.base.eth', ''),
            pfp: profileData?.pfpUrl || profileData?.avatar || null,
            bio: profileData?.bio || '',
            address: address,
          },
        });
      }

      return NextResponse.json({ exists: false });
    } catch (contractError) {
      console.error('Contract read error:', contractError);
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking Base App:', error);
    return NextResponse.json({ exists: false });
  }
}
