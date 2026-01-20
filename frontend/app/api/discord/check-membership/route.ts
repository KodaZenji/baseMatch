import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_VERIFIED_ROLE_ID = process.env.DISCORD_VERIFIED_ROLE_ID;

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ 
        inServer: false, 
        hasVerifiedRole: false 
      });
    }

    const normalizedAddress = address.toLowerCase();

    // Get user's Discord ID from database
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('discord_user_id')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (profileError || !profile?.discord_user_id) {
      // User hasn't connected Discord yet
      return NextResponse.json({ 
        inServer: false, 
        hasVerifiedRole: false 
      });
    }

    const discordUserId = profile.discord_user_id;

    // Check if user is in the server and has the verified role
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      console.error('Discord bot credentials not configured');
      return NextResponse.json({ 
        inServer: false, 
        hasVerifiedRole: false 
      });
    }

    // Get member info from Discord
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberResponse.ok) {
      // User is not in the server
      return NextResponse.json({ 
        inServer: false, 
        hasVerifiedRole: false 
      });
    }

    const member = await memberResponse.json();
    
    // Check if verified role check is enabled
    let hasVerifiedRole = true; // Default to true if no verified role is configured
    
    if (DISCORD_VERIFIED_ROLE_ID) {
      hasVerifiedRole = member.roles.includes(DISCORD_VERIFIED_ROLE_ID);
    }

    console.log('✅ Membership check:', {
      userId: discordUserId,
      inServer: true,
      hasVerifiedRole,
      verifiedRoleRequired: !!DISCORD_VERIFIED_ROLE_ID,
      totalRoles: member.roles.length
    });

    return NextResponse.json({ 
      inServer: true, 
      hasVerifiedRole,
      username: member.user?.username 
    });

  } catch (error) {
    console.error('Check membership error:', error);
    return NextResponse.json({ 
      inServer: false, 
      hasVerifiedRole: false 
    });
  }
}
