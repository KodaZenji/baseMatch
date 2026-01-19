import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getName } from '@coinbase/onchainkit/identity';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ exists: false, error: 'Address required' }, { status: 400 });
    }

    try {
      // Use OnchainKit to get the basename
      const basename = await getName({ address: address as `0x${string}`, chain: base });

      if (basename) {
        // Fetch profile data from base.app
        let profileData: any = null;
        try {
          const username = basename.replace('.base.eth', '');
          const profileResponse = await fetch(`https://base.app/api/profile/${username}`, {
            headers: { 'Accept': 'application/json' },
          });
          
          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          }
        } catch (error) {
          console.log('Could not fetch Base App profile data:', error);
        }

        const photoUrl =
          profileData?.pfpUrl ||
          profileData?.avatar ||
          profileData?.pfp?.url ||
          '';

        return NextResponse.json({
          exists: true,
          profile: {
            basename: basename,
            username: basename.replace('.base.eth', ''),
            displayName: profileData?.displayName || basename.replace('.base.eth', ''),
            bio: profileData?.bio || '',
            address,
            pfp: photoUrl,
            pfp_url: photoUrl,
            photoUrl,
          },
        });
      }

      return NextResponse.json({ exists: false });
    } catch (contractError) {
      console.error('Basename lookup error:', contractError);
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking Base App:', error);
    return NextResponse.json({ exists: false });
  }
}
