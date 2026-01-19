// app/api/check-farcaster/route.ts
// ENHANCED VERSION: Now properly returns avatar for signup flow

import { NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const neynarClient = new NeynarAPIClient({
      apiKey: process.env.NEYNAR_API_KEY!
    });

    console.log('🔍 Checking Farcaster for address:', address);

    // Fetch by wallet address
    const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({
      addresses: [address.toLowerCase()]
    });

    const users = result?.users || [];

    if (users.length === 0) {
      console.log('❌ No Farcaster account found');
      return NextResponse.json({ exists: false });
    }

    const rawUser = users[0] as any;

    // CRITICAL: Properly extract avatar with multiple fallbacks
    const photoUrl = 
      rawUser.pfp_url ||           // Primary field
      rawUser.pfp?.url ||          // Nested object
      rawUser.profile?.pfp_url ||  // Profile nested
      '';

    console.log('✅ Farcaster profile found:', {
      fid: rawUser.fid,
      username: rawUser.username,
      hasAvatar: !!photoUrl,
      avatarUrl: photoUrl ? photoUrl.substring(0, 50) + '...' : 'none'
    });

    // Return comprehensive profile data for signup
    return NextResponse.json({
      exists: true,
      profile: {
        // Identity
        fid: rawUser.fid,
        username: rawUser.username,
        displayName: rawUser.display_name || rawUser.username,
        
        // Bio/Description
        bio: rawUser.profile?.bio?.text || '',
        
        // Social stats
        followerCount: rawUser.follower_count || 0,
        followingCount: rawUser.following_count || 0,

        // CRITICAL: Avatar with all fallback fields for compatibility
        pfp: photoUrl,
        pfp_url: photoUrl,
        photoUrl: photoUrl,
        
        // Additional metadata
        verifications: rawUser.verifications || [],
        verified_addresses: rawUser.verified_addresses || {},
      }
    });
  } catch (err: any) {
    console.error('❌ check-farcaster error:', err);
    return NextResponse.json({ 
      exists: false,
      error: 'Failed to check Farcaster account'
    }, { status: 500 });
  }
}
