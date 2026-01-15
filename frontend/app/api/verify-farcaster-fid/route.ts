import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function POST(request: Request) {
  try {
    const { address, fid, username } = await request.json();

    if (!address || !fid || !username) {
      return NextResponse.json(
        { error: 'Address, FID, and username required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const normalizedUsername = username.toLowerCase().trim();

    // Check rate limit (3 attempts per 24 hours)
    const { data: attempts, error: attemptsError } = await supabaseService
      .from('farcaster_verification_attempts')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('attempted_at', { ascending: false });

    if (attemptsError) console.error('Error checking attempts:', attemptsError);

    const attemptCount = attempts?.length || 0;
    if (attemptCount >= 3) {
      const oldestAttempt = attempts?.[attempts.length - 1];
      const timeUntilReset = oldestAttempt 
        ? new Date(new Date(oldestAttempt.attempted_at).getTime() + 24 * 60 * 60 * 1000).toLocaleString()
        : 'soon';

      return NextResponse.json(
        { 
          error: `Rate limit exceeded. Try again after ${timeUntilReset}`,
          attemptsLeft: 0,
        },
        { status: 429 }
      );
    }

    // Initialize Neynar client correctly
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Verification service unavailable' },
        { status: 500 }
      );
    }

    const neynarClient = new NeynarAPIClient({
      apiKey: process.env.NEYNAR_API_KEY
    });

    let fidUser;
    try {
      // fetchBulkUsers expects an object with `fids` array
      const result = await neynarClient.fetchBulkUsers({ fids: [parseInt(fid)] });
      fidUser = result.users?.[0];
    } catch (error) {
      console.error('Neynar error:', error);

      // Log failed attempt
      await supabaseService
        .from('farcaster_verification_attempts')
        .insert({
          wallet_address: normalizedAddress,
          fid: fid,
          username_attempted: normalizedUsername,
          success: false,
          attempted_at: new Date().toISOString(),
        });

      return NextResponse.json(
        { 
          error: 'FID not found or invalid',
          attemptsLeft: 2 - attemptCount,
        },
        { status: 400 }
      );
    }

    // Compare username
    const actualUsername = fidUser.username.toLowerCase();
    if (actualUsername !== normalizedUsername) {
      await supabaseService
        .from('farcaster_verification_attempts')
        .insert({
          wallet_address: normalizedAddress,
          fid: fid,
          username_attempted: normalizedUsername,
          success: false,
          attempted_at: new Date().toISOString(),
        });

      return NextResponse.json(
        { 
          error: 'Username does not match FID. Please try again.',
          attemptsLeft: 2 - attemptCount,
        },
        { status: 400 }
      );
    }

    // Success! Log success
    await supabaseService
      .from('farcaster_verification_attempts')
      .insert({
        wallet_address: normalizedAddress,
        fid: fid,
        username_attempted: normalizedUsername,
        success: true,
        attempted_at: new Date().toISOString(),
      });

    // Update profile
    await supabaseService
      .from('profiles')
      .update({
        farcaster_verified: true,
        farcaster_fid: fid,
        farcaster_username: actualUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', normalizedAddress);

    return NextResponse.json({
      verified: true,
      profile: {
        fid: fidUser.fid,
        username: fidUser.username,
        displayName: fidUser.display_name,
        pfp: fidUser.pfp_url,
      },
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
