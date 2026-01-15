import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const EARLY_OG_ROLE_ID = process.env.DISCORD_EARLY_OG_ROLE_ID;

interface DiscordVerificationAttempt {
  wallet_address: string;
  discord_user_id: string;
  farcaster_fid: string;
  attempt_count: number;
  first_attempt_at: string;
  last_attempt_at: string;
  verified: boolean;
  role_granted: boolean;
  ip_address: string;
  user_agent: string;
}

export async function POST(request: Request) {
  try {
    const { walletAddress, discordUserId } = await request.json();

    if (!walletAddress || !discordUserId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        success: false 
      }, { status: 400 });
    }

    
    const headersList = await headers(); 
    const isInternalRequest = headersList.get('x-internal-request') === 'true';
    
    if (!isInternalRequest && process.env.NODE_ENV === 'production') {
      console.error('🚨 SECURITY: Direct API call blocked');
      return NextResponse.json({ 
        error: 'Invalid request',
        success: false 
      }, { status: 403 });
    }

    const userAgent = headersList.get('user-agent') || '';
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      'unknown';

    const normalizedAddress = walletAddress.toLowerCase();

    // Get user profile with FID
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        success: false 
      }, { status: 404 });
    }

    if (!profile.farcaster_verified) {
      return NextResponse.json({ 
        error: 'Farcaster verification required',
        success: false 
      }, { status: 403 });
    }

    // 🎯 CHECK: Must have FID
    if (!profile.farcaster_fid) {
      return NextResponse.json({ 
        error: 'Farcaster FID not found. Please re-verify your Farcaster.',
        success: false 
      }, { status: 403 });
    }

    const farcasterFid = String(profile.farcaster_fid);

    // 🎯 NEW: Check if THIS FID already verified (regardless of wallet)
    const { data: existingFidVerification } = await supabaseService
      .from('discord_verification_attempts')
      .select('*')
      .eq('farcaster_fid', farcasterFid)
      .eq('verified', true)
      .eq('role_granted', true)
      .single();

    if (existingFidVerification) {
      console.warn('🚨 SYBIL ATTEMPT: FID already verified with different wallet', {
        fid: farcasterFid,
        previousWallet: existingFidVerification.wallet_address,
        attemptedWallet: normalizedAddress,
        discordUserId: existingFidVerification.discord_user_id
      });

      await logSuspiciousActivity(
        normalizedAddress,
        discordUserId,
        ipAddress,
        `FID_ALREADY_VERIFIED:${farcasterFid}:previous_wallet:${existingFidVerification.wallet_address}`
      );

      return NextResponse.json({ 
        error: 'This Farcaster account already verified Discord with a different wallet. Only 1 verification per Farcaster account allowed.',
        success: false,
        alreadyVerified: true
      }, { status: 403 });
    }

    // Check attempts for this wallet
    const { data: existingAttempts } = await supabaseService
      .from('discord_verification_attempts')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .order('last_attempt_at', { ascending: false });

    // Check if already verified with this exact wallet
    const previouslyVerified = existingAttempts?.find(a => a.verified && a.role_granted);
    
    if (previouslyVerified) {
      const timeSince = Date.now() - new Date(previouslyVerified.last_attempt_at).getTime();
      const hoursSince = timeSince / (1000 * 60 * 60);
      
      if (hoursSince < 24) {
        const recentAttempts = existingAttempts?.filter(a => {
          const attemptTime = new Date(a.last_attempt_at).getTime();
          return (Date.now() - attemptTime) < (24 * 60 * 60 * 1000);
        }) || [];

        if (recentAttempts.length >= 3) {
          console.warn('🚨 SYBIL DETECTED - Multiple attempts');
          await revokeDiscordRole(discordUserId);
          await logSuspiciousActivity(normalizedAddress, discordUserId, ipAddress, 'MULTIPLE_ATTEMPTS');
          
          await supabaseService
            .from('discord_verification_attempts')
            .update({ role_granted: false, verified: false })
            .eq('wallet_address', normalizedAddress);

          return NextResponse.json({ 
            error: 'Role revoked due to suspicious activity',
            success: false,
            revoked: true
          }, { status: 403 });
        }

        return NextResponse.json({ 
          message: 'Already verified',
          success: true,
          alreadyVerified: true
        });
      }
    }

    // 🎯 NEW: Record attempt with FID
    const attemptData: Partial<DiscordVerificationAttempt> = {
      wallet_address: normalizedAddress,
      discord_user_id: discordUserId,
      farcaster_fid: farcasterFid, // ← Store FID
      attempt_count: (existingAttempts?.length || 0) + 1,
      first_attempt_at: existingAttempts?.[0]?.first_attempt_at || new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      verified: true,
      role_granted: false,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    // Grant role
    const roleGranted = await grantDiscordRole(discordUserId);

    if (roleGranted) {
      attemptData.role_granted = true;

      await supabaseService
        .from('discord_verification_attempts')
        .upsert(attemptData, { 
          onConflict: 'farcaster_fid,discord_user_id' // ← Use FID in conflict resolution
        });

      await supabaseService
        .from('profiles')
        .update({ discord_verified: true, discord_user_id: discordUserId })
        .eq('wallet_address', normalizedAddress);

      console.log('✅ Discord verified for FID:', farcasterFid, 'Wallet:', normalizedAddress);

      return NextResponse.json({ 
        success: true,
        message: 'Early OG role granted!',
        role: 'Early OG'
      });
    }

    return NextResponse.json({ 
      error: 'Failed to grant role',
      success: false 
    }, { status: 500 });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      error: 'Verification failed',
      success: false 
    }, { status: 500 });
  }
}

async function grantDiscordRole(discordUserId: string): Promise<boolean> {
  try {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !EARLY_OG_ROLE_ID) {
      console.error('Discord credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${EARLY_OG_ROLE_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok || response.status === 204) {
      console.log('✅ Role granted:', discordUserId);
      return true;
    }

    const error = await response.text();
    console.error('Discord API error:', error);
    return false;
  } catch (error) {
    console.error('Error granting role:', error);
    return false;
  }
}

async function revokeDiscordRole(discordUserId: string): Promise<boolean> {
  try {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !EARLY_OG_ROLE_ID) return false;

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${EARLY_OG_ROLE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    return response.ok || response.status === 204;
  } catch (error) {
    return false;
  }
}

async function logSuspiciousActivity(wallet: string, discord: string, ip: string, reason: string) {
  try {
    await supabaseService
      .from('suspicious_activity_log')
      .insert({ 
        wallet_address: wallet, 
        discord_user_id: discord, 
        ip_address: ip, 
        reason, 
        timestamp: new Date().toISOString() 
      });
  } catch (error) {
    console.error('Error logging:', error);
  }
}
