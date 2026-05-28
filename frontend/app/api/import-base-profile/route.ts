// app/api/import-base-profile/route.ts
//
// Correct implementation using:
// - toCoinType(base.id) for proper Base L2 Basename resolution
// - OnchainKit getAvatar for avatar resolution
// - L1 mainnet client for ENS/CCIP resolution

import { NextResponse } from 'next/server';
import { createPublicClient, http, toCoinType } from 'viem';
import { mainnet, base } from 'viem/chains';
import { normalize } from 'viem/ens';
import { getAvatar } from '@coinbase/onchainkit/identity';
import { supabaseService } from '@/lib/supabase.server';

// L1 mainnet client — required for ENS CCIP-Read resolution of Base L2 Basenames
// NOTE: You need ALCHEMY_ETH_MAINNET_KEY (eth-mainnet) separate from your
// existing Base mainnet key (base-mainnet) in wagmi.ts ( Fixed ✓) 
const l1Client = createPublicClient({
  chain: mainnet,
  transport: http(
    `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ETH_MAINNET_KEY}`
  ),
});

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address || !address.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid wallet address required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase() as `0x${string}`;

    // ── Step 1: Resolve Basename using coinType for Base L2 ──────────────
    // toCoinType(base.id) is required — without it, only L1 ENS resolves
    let basename: string | null = null;
    try {
      basename = await l1Client.getEnsName({
        address: normalizedAddress,
        coinType: toCoinType(base.id),
      });
    } catch (err) {
      console.error('Basename resolution error:', err);
    }

    if (!basename) {
      return NextResponse.json(
        { error: 'No Basename found for this wallet. Try signing up manually.' },
        { status: 404 }
      );
    }

    // ── Step 2: Resolve avatar via OnchainKit getAvatar ──────────────────
    // OnchainKit's getAvatar checks Base L2 ENS text records correctly
    let avatarUrl: string | null = null;
    try {
      avatarUrl = await getAvatar({
        ensName: normalize(basename),
        chain: base, // ← Base chain for Base L2 avatar records
      });
    } catch (err) {
      console.error('Avatar resolution error:', err);
      // Non-fatal — proceed without avatar
    }

    // ── Step 3: Fetch bio text record ────────────────────────────────────
    let bio: string | null = null;
    try {
      bio = await l1Client.getEnsText({
        name: normalize(basename),
        key: 'description',
      });
    } catch (err) {
      // Non-fatal
    }

    // ── Step 4: Derive display name ──────────────────────────────────────
    // "aurio.base.eth" → "aurio" | "aurio.farcaster.eth" → "aurio
    const displayName = basename.split('.')[0];

    // ── Step 5: Optionally store basename in Supabase ────────────────────
    try {
      await supabaseService
        .from('profiles')
        .update({
          basename,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', normalizedAddress);
    } catch (err) {
      // Non-fatal at this stage
      console.warn('Could not update basename (profile may not exist yet):', err);
    }

    return NextResponse.json({
      verified: true,
      profile: {
        basename,
        displayName,
        pfp: avatarUrl || '',
        bio: bio || '',
      },
    });

  } catch (error) {
    console.error('Base profile import error:', error);
    return NextResponse.json(
      { error: 'Import failed. Please try again.' },
      { status: 500 }
    );
  }
}
