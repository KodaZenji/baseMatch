import { NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ exists: false, error: 'Address required' }, { status: 400 });
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.warn('NEYNAR_API_KEY not configured');
      return NextResponse.json({ exists: false });
    }

    const neynarClient = new NeynarAPIClient({ 
      apiKey: process.env.NEYNAR_API_KEY 
    });

    // Use the correct method name: fetchBulkUsersByEthOrSolAddress
    const result = await neynarClient.fetchBulkUsersByEthOrSolAddress([
      address.toLowerCase() as `0x${string}`
    ]);

    const users = result[address.toLowerCase()];

    if (users && users.length > 0) {
      const user = users[0];
      return NextResponse.json({
        exists: true,
        profile: {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfp: user.pfp_url,
          bio: user.profile?.bio?.text || '',
          followerCount: user.follower_count || 0,
        },
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error checking Farcaster:', error);
    return NextResponse.json({ exists: false });
  }
}
