import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getName, getAvatar } from '@coinbase/onchainkit/identity';
import { normalize } from 'viem/ens';

const L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

const TEXT_RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    name: 'text',
    outputs: [{ name: '', type: 'string' }],
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

    const RPC_URL = process.env.ALCHEMY_RPC_URL;
    if (!RPC_URL) {
      return NextResponse.json({ exists: false, error: 'RPC URL not configured' }, { status: 500 });
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    try {
      // Get the basename
      const basename = await getName({ address: address as `0x${string}`, chain: base });

      if (basename) {
        const username = basename.replace('.base.eth', '');
        
        // Get avatar
        let avatarUrl = '';
        try {
          avatarUrl = await getAvatar({ ensName: basename, chain: base }) || '';
        } catch (error) {
          console.log('No avatar found');
        }

        // Get additional ENS text records (bio, twitter, etc.)
        let bio = '';
        let twitter = '';
        let github = '';
        
        try {
          const node = normalize(basename);
          const namehash = require('viem/ens').namehash(node);
          
          // Try to fetch description/bio
          bio = await publicClient.readContract({
            address: L2_RESOLVER_ADDRESS,
            abi: TEXT_RESOLVER_ABI,
            functionName: 'text',
            args: [namehash, 'description'],
          }) || '';

          // Try to fetch social links
          twitter = await publicClient.readContract({
            address: L2_RESOLVER_ADDRESS,
            abi: TEXT_RESOLVER_ABI,
            functionName: 'text',
            args: [namehash, 'com.twitter'],
          }) || '';

          github = await publicClient.readContract({
            address: L2_RESOLVER_ADDRESS,
            abi: TEXT_RESOLVER_ABI,
            functionName: 'text',
            args: [namehash, 'com.github'],
          }) || '';
        } catch (error) {
          console.log('Could not fetch text records:', error);
        }
        
        return NextResponse.json({
          exists: true,
          profile: {
            basename: basename,
            username: username,
            displayName: username,
            bio: bio,
            address,
            pfp: avatarUrl,
            pfp_url: avatarUrl,
            photoUrl: avatarUrl,
            twitter: twitter,
            github: github,
          },
        });
      }

      return NextResponse.json({ exists: false });
    } catch (error) {
      console.error('Basename lookup error:', error);
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking Base App:', error);
    return NextResponse.json({ exists: false });
  }
}
