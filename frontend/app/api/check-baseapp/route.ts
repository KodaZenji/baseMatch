import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getName, getAvatar } from '@coinbase/onchainkit/identity';
import { normalize } from 'viem/ens';
import { getAvatarUrl } from '@/lib/avatarStorage';

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
    const { address, isBaseAccount } = await request.json();

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

    console.log('🔍 Checking Base Account for address:', address);
    console.log('🔵 Is Base Account environment:', isBaseAccount);

    try {
      // STEP 1: Check if this is a Base Account (ERC-4337 Smart Wallet)
      let isSmartWallet = false;
      let baseAccountData: any = null;

      if (isBaseAccount) {
        try {
          const code = await publicClient.getBytecode({ address: address as `0x${string}` });
          isSmartWallet = code !== undefined && code !== '0x';
          
          console.log('✅ Smart Wallet detected:', isSmartWallet);

          if (isSmartWallet) {
            baseAccountData = {
              isBaseAccount: true,
              accountType: 'smart-wallet',
            };
          }
        } catch (error) {
          console.log('⚠️ Could not verify smart wallet status:', error);
        }
      }

      // STEP 2: Get Basename from base-org/accounts ONLY
      const basename = await getName({ address: address as `0x${string}`, chain: base });

      if (basename) {
        const username = basename.replace('.base.eth', '');
        
        console.log('✅ Basename found:', basename);

        // STEP 3: Get Base Account avatar and cache to Supabase
        let avatarUrl = '';
        let rawAvatarUrl = '';
        try {
          const fetchedAvatar = await getAvatar({ ensName: basename, chain: base });
          rawAvatarUrl = fetchedAvatar || '';
          
          if (rawAvatarUrl) {
            // Download from IPFS and cache to Supabase Storage
            avatarUrl = await getAvatarUrl(rawAvatarUrl);
            
            console.log('🖼️ Base Account avatar processed!');
            console.log('   Raw IPFS URL:', rawAvatarUrl);
            console.log('   Supabase URL:', avatarUrl);
          } else {
            console.log('❌ No avatar found (will use dicebear fallback)');
          }
        } catch (error) {
          console.log('⚠️ Error fetching avatar:', error);
        }

        // STEP 4: Get text records using viem direct contract calls
        let bio = '';
        let twitter = '';
        let github = '';
        let email = '';
        let displayName = '';
        
        try {
          console.log('📝 Fetching text records for:', basename);
          
          const node = normalize(basename);
          const namehash = require('viem/ens').namehash(node);
          
          // Fetch text records directly from L2 resolver
          [bio, twitter, github, email, displayName] = await Promise.all([
            publicClient.readContract({
              address: L2_RESOLVER_ADDRESS,
              abi: TEXT_RESOLVER_ABI,
              functionName: 'text',
              args: [namehash, 'description'],
            }).catch(() => ''),
            
            publicClient.readContract({
              address: L2_RESOLVER_ADDRESS,
              abi: TEXT_RESOLVER_ABI,
              functionName: 'text',
              args: [namehash, 'com.twitter'],
            }).catch(() => ''),
            
            publicClient.readContract({
              address: L2_RESOLVER_ADDRESS,
              abi: TEXT_RESOLVER_ABI,
              functionName: 'text',
              args: [namehash, 'com.github'],
            }).catch(() => ''),
            
            publicClient.readContract({
              address: L2_RESOLVER_ADDRESS,
              abi: TEXT_RESOLVER_ABI,
              functionName: 'text',
              args: [namehash, 'email'],
            }).catch(() => ''),
            
            publicClient.readContract({
              address: L2_RESOLVER_ADDRESS,
              abi: TEXT_RESOLVER_ABI,
              functionName: 'text',
              args: [namehash, 'name'],
            }).catch(() => ''),
          ]);

          console.log('📝 Text records fetched:', { 
            bio: bio ? `✅ "${bio.substring(0, 50)}..."` : '❌',
            displayName: displayName ? `✅ "${displayName}"` : '❌',
            avatar: avatarUrl ? '✅ (cached in Supabase)' : '❌',
            twitter: twitter ? '✅' : '❌',
            github: github ? '✅' : '❌',
            email: email ? '✅' : '❌'
          });
        } catch (error) {
          console.log('⚠️ Error fetching text records:', error);
        }
        
        return NextResponse.json({
          exists: true,
          isBaseAccount: isSmartWallet || isBaseAccount || false,
          accountType: isSmartWallet ? 'smart-wallet' : 'eoa',
          profile: {
            basename: basename,
            username: username,
            displayName: displayName || username,
            bio: bio, // Maps to interests in frontend
            description: bio,
            address,
            // Avatar URLs - Supabase Storage URL (faster, cached)
            avatar: avatarUrl,
            photoUrl: avatarUrl,
            pfp: avatarUrl,
            pfp_url: avatarUrl,
            twitter: twitter,
            github: github,
            email: email,
            isSmartWallet: isSmartWallet,
            ...(baseAccountData || {}),
          },
        });
      }

      // STEP 5: Base Account without Basename
      if (isSmartWallet || isBaseAccount) {
        console.log('✅ Base Account detected without Basename');
        
        return NextResponse.json({
          exists: true,
          isBaseAccount: true,
          accountType: 'smart-wallet',
          profile: {
            displayName: 'Base Account User',
            username: address.slice(0, 8),
            bio: '',
            description: '',
            address,
            avatar: '',
            photoUrl: '',
            pfp: '',
            pfp_url: '',
            twitter: '',
            github: '',
            email: '',
            isBaseAccount: true,
            isSmartWallet: true,
            needsBasename: true,
          },
        });
      }

      return NextResponse.json({ 
        exists: false, 
        isBaseAccount: false,
        accountType: 'eoa'
      });
    } catch (error) {
      console.error('❌ Base Account lookup error:', error);
      return NextResponse.json({ 
        exists: false, 
        isBaseAccount: isBaseAccount || false 
      });
    }
  } catch (error) {
    console.error('❌ Error checking Base Account:', error);
    return NextResponse.json({ exists: false });
  }
}
