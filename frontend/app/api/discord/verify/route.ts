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
    const { walletAddress, discordUserId, token } = await request.json();

    if (!walletAddress || !discordUserId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        success: false 
      }, { status: 400 });
    }

    // 🔐 SECURITY: Only accept requests from our own callback route
    const headersList = headers();
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

    // Verify user has Farcaster verification
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

    // Check existing attempts
    const { data: existingAttempts } = await supabaseService
      .from('discord_verification_attempts')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .order('last_attempt_at', { ascending: false });

    // Check if already verified
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
          console.warn('🚨 SYBIL DETECTED - Revoking role');
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

    // Check wallet reuse
    const sameWalletDifferentDiscord = existingAttempts?.find(
      a => a.discord_user_id !== discordUserId && a.verified
    );

    if (sameWalletDifferentDiscord) {
      await logSuspiciousActivity(normalizedAddress, discordUserId, ipAddress, 'WALLET_REUSE');
      return NextResponse.json({ 
        error: 'Wallet already linked to another Discord',
        success: false 
      }, { status: 403 });
    }

    // Record attempt
    const attemptData: Partial<DiscordVerificationAttempt> = {
      wallet_address: normalizedAddress,
      discord_user_id: discordUserId,
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
        .upsert(attemptData, { onConflict: 'wallet_address,discord_user_id' });

      await supabaseService
        .from('profiles')
        .update({ discord_verified: true, discord_user_id: discordUserId })
        .eq('wallet_address', normalizedAddress);

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
      .insert({ wallet_address: wallet, discord_user_id: discord, ip_address: ip, reason, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error logging:', error);
  }
}
