import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/discord-security';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.farcaster_verified) {
      return NextResponse.json(
        { error: 'Farcaster verification required' },
        { status: 403 }
      );
    }

    const state = generateStateToken(normalizedAddress);

    console.log('✅ Generated secure state token for:', normalizedAddress);

    return NextResponse.json({
      state,
      expiresIn: 900,
    });

  } catch (error) {
    console.error('Error generating state token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
