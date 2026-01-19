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

// Base Account Contract (ERC-4337 Smart Wallet)
const BASE_ACCOUNT_FACTORY = '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a'; // Base Account Factory

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
      // PRIORITY 1: Check if this is a Base Account (ERC-4337 Smart Wallet)
      let isSmartWallet = false;
      let baseAccountData: any = null;

      if (isBaseAccount) {
        try {
          // Check if address is a smart contract (Base Account indicator)
          const code = await publicClient.getBytecode({ address: address as `0x${string}` });
          isSmartWallet = code !== undefined && code !== '0x';
          
          console.log('✅ Smart Wallet detected:', isSmartWallet);

          if (isSmartWallet) {
            // This is likely a Base Account - prioritize this data
            baseAccountData = {
              isBaseAccount: true,
              accountType: 'smart-wallet',
            };
          }
        } catch (error) {
          console.log('⚠️ Could not verify smart wallet status:', error);
        }
      }

      // PRIORITY 2: Get Basename (if exists)
      const basename = await getName({ address: address as `0x${string}`, chain: base });

      if (basename) {
        const username = basename.replace('.base.eth', '');
        
        console.log('✅ Basename found:', basename);

        // Get avatar
        let avatarUrl = '';
        try {
          avatarUrl = await getAvatar({ ensName: basename, chain: base }) || '';
        } catch (error) {
          console.log('No avatar found for basename');
        }

        // Get ENS text records from Basename
        let bio = '';
        let twitter = '';
        let github = '';
        let email = '';
        let displayName = '';
        
        try {
          const node = normalize(basename);
          const namehash = require('viem/ens').namehash(node);
          
          // Fetch all available text records
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

          console.log('📝 Text records found:', { bio, twitter, github, email, displayName });
        } catch (error) {
          console.log('⚠️ Could not fetch text records:', error);
        }
        
        return NextResponse.json({
          exists: true,
          isBaseAccount: isSmartWallet || isBaseAccount || false,
          accountType: isSmartWallet ? 'smart-wallet' : 'eoa',
          profile: {
            basename: basename,
            username: username,
            displayName: displayName || username,
            bio: bio,
            address,
            pfp: avatarUrl,
            pfp_url: avatarUrl,
            photoUrl: avatarUrl,
            twitter: twitter,
            github: github,
            email: email,
            // Base Account specific fields
            ...(baseAccountData || {}),
          },
        });
      }

      // PRIORITY 3: Even without Basename, if it's Base Account, return success
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
            address,
            pfp: '',
            pfp_url: '',
            photoUrl: '',
            twitter: '',
            github: '',
            email: '',
            isBaseAccount: true,
            needsBasename: true, // Flag to suggest getting a Basename
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
