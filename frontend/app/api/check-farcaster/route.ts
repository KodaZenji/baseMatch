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
      apiKey: process.env.NEYNAR_API_KEY
    });

    // Fetch by wallet address
    const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({
      addresses: [address.toLowerCase()]
    });

    const users = result?.users || [];

    if (users.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const rawUser = users[0] as any; // loosen type because Neynar typings vary

    const photoUrl =
      rawUser.pfp_url ||
      rawUser.pfp?.url ||
      '';

    return NextResponse.json({
      exists: true,
      profile: {
        fid: rawUser.fid,
        username: rawUser.username,
        displayName: rawUser.display_name || rawUser.username,
        bio: rawUser.profile?.bio?.text || '',
        followerCount: rawUser.follower_count || 0,

        // backwards compatibility fields
        pfp: photoUrl,
        pfp_url: photoUrl,
        photoUrl
      }
    });
  } catch (err: any) {
    console.error('check-farcaster error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
