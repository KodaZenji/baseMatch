// app/api/check-verification-attempts/route.ts - NEW FILE

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get attempts in last 24 hours
    const { data: attempts, error } = await supabaseService
      .from('farcaster_verification_attempts')
      .select('attempted_at')
      .eq('wallet_address', normalizedAddress)
      .gte('attempted_at', twentyFourHoursAgo)
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('Error checking attempts:', error);
      return NextResponse.json(
        { attemptsLeft: 3, attemptCount: 0 },
        { status: 200 }
      );
    }

    const attemptCount = attempts?.length || 0;
    const attemptsLeft = Math.max(0, 3 - attemptCount);

    // If rate limited, calculate reset time
    let resetAt = null;
    if (attemptCount >= 3 && attempts.length > 0) {
      const oldestAttempt = attempts[attempts.length - 1];
      resetAt = new Date(new Date(oldestAttempt.attempted_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    return NextResponse.json({
      attemptCount,
      attemptsLeft,
      resetAt,
      isRateLimited: attemptCount >= 3,
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { attemptsLeft: 3, attemptCount: 0 },
      { status: 200 }
    );
  }
}
