import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { address, updatePhoto } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Step 1: Check if wallet has Farcaster account
    const farcasterResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/check-farcaster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: normalizedAddress }),
    });

    const farcasterData = await farcasterResponse.json();

    if (!farcasterData.exists) {
      return NextResponse.json({
        verified: false,
        message: 'No Farcaster account linked to this wallet yet.',
      });
    }

    // Step 2: Farcaster found - Update database
    const updateData: any = {
      farcaster_verified: true,
      updated_at: new Date().toISOString(),
    };

    // If user wants to use Farcaster photo, update it
    if (updatePhoto && farcasterData.profile?.pfp) {
      updateData.photoUrl = farcasterData.profile.pfp;
    }

    const { error: updateError } = await supabaseService
      .from('profiles')
      .update(updateData)
      .eq('wallet_address', normalizedAddress);

    if (updateError) {
      console.error('Error updating Farcaster verification:', updateError);
      return NextResponse.json({ error: 'Failed to verify' }, { status: 500 });
    }

    console.log('✅ Farcaster verified for:', normalizedAddress, updatePhoto ? '(with photo update)' : '(no photo update)');

    return NextResponse.json({
      verified: true,
      message: updatePhoto 
        ? 'Farcaster verified and profile photo updated!' 
        : 'Farcaster verified successfully!',
      profile: farcasterData.profile,
    });

  } catch (error) {
    console.error('Error verifying Farcaster:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
