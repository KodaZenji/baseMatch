import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const { address, fid, username, displayName, pfpUrl } = await request.json();

    if (!address || !fid || !username) {
      return NextResponse.json(
        { error: 'Address, FID, and username required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Log the Base app verification attempt
    await supabaseService
      .from('farcaster_verification_attempts')
      .insert({
        wallet_address: normalizedAddress,
        fid: parseInt(fid),
        username_attempted: username,
        success: true,
        attempted_at: new Date().toISOString(),
      });

    // Update profile with Farcaster data
    await supabaseService
      .from('profiles')
      .update({
        farcaster_verified: true,
        farcaster_fid: parseInt(fid),
        farcaster_username: username,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', normalizedAddress);

    return NextResponse.json({
      verified: true,
      profile: {
        fid: fid,
        username: username,
        displayName: displayName || username,
        pfp: pfpUrl || '',
      },
    });

  } catch (error) {
    console.error('Base app verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
