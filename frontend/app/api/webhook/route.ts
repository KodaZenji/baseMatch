import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper function to resolve FID to wallet address via Neynar API
async function resolveFidToAddress(fid: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY!
        }
      }
    );

    if (!response.ok) {
      console.error('Neynar API error:', response.status);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    // Get verified Ethereum addresses
    const verifiedAddresses = user?.verified_addresses?.eth_addresses || [];
    
    if (verifiedAddresses.length > 0) {
      console.log(`✅ Resolved FID ${fid} to address:`, verifiedAddresses[0]);
      return verifiedAddresses[0];
    }

    console.log(`⚠️ No verified addresses found for FID ${fid}`);
    return null;
  } catch (error) {
    console.error('❌ Error resolving FID to address:', error);
    return null;
  }
}

export async function POST(request: Request) {
    try {
        const requestJson = await request.json();
        
        console.log('📥 Webhook received:', {
            timestamp: new Date().toISOString(),
            event: requestJson
        });

        const event = requestJson.event || requestJson;
        const eventType = event.type || event.event || 'unknown';
        
        const supabase = getSupabaseAdmin();

        switch (eventType) {
            case 'miniapp_added':
            case 'notifications_enabled':
                console.log('🔔 Mini app added/notifications enabled:', event);
                
                if (event.notificationDetails) {
                    const { token, url } = event.notificationDetails;
                    const fid = event.fid;
                    let userAddress: string | null = null;

                    // Step 1: Try to find wallet address in your database using FID
                    console.log(`🔍 Looking up FID ${fid} in profiles table...`);
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('wallet_address')
                        .eq('fid', fid)
                        .single();
                    
                    if (profile?.wallet_address) {
                        userAddress = profile.wallet_address;
                        console.log(`✅ Found address in database for FID ${fid}:`, userAddress);
                    } else {
                        // Step 2: Fallback - resolve via Neynar API
                        console.log(`⚠️ FID ${fid} not in database, resolving via Neynar API...`);
                        userAddress = await resolveFidToAddress(fid);
                        
                        if (userAddress) {
                            // Update the profile with the FID for future lookups
                            const { error: updateError } = await supabase
                                .from('profiles')
                                .update({ fid: fid })
                                .eq('wallet_address', userAddress.toLowerCase());
                            
                            if (!updateError) {
                                console.log(`✅ Updated profile with FID ${fid} for address:`, userAddress);
                            } else {
                                console.log(`⚠️ Could not update profile (may not exist yet):`, updateError.message);
                            }
                        }
                    }
                    
                    if (!userAddress) {
                        console.error(`❌ Could not resolve FID ${fid} to wallet address`);
                        // Still return success to not break the user flow
                        return NextResponse.json({ 
                            success: true,
                            message: 'User mapping pending - will retry on next interaction'
                        });
                    }
                    
                    // Step 3: Store the notification token with the real wallet address
                    const { error: tokenError } = await supabase
                        .from('farcaster_tokens')
                        .upsert({
                            fid: fid,
                            user_address: userAddress.toLowerCase(),
                            token: token,
                            notification_url: url,
                            enabled: true,
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'fid'
                        });
                    
                    if (tokenError) {
                        console.error('❌ Error storing token:', tokenError);
                        return NextResponse.json({ 
                            success: false,
                            message: 'Failed to store notification token'
                        }, { status: 500 });
                    }
                    
                    console.log(`✅ Token stored successfully for FID ${fid}, address: ${userAddress}`);
                }
                
                return NextResponse.json({ 
                    success: true,
                    message: 'Mini app added successfully' 
                });

            case 'miniapp_removed':
            case 'notifications_disabled':
                console.log('🔕 Mini app removed/notifications disabled:', event);
                
                const { error: disableError } = await supabase
                    .from('farcaster_tokens')
                    .update({ 
                        enabled: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('fid', event.fid);
                
                if (disableError) {
                    console.error('❌ Error disabling token:', disableError);
                } else {
                    console.log(`✅ Notifications disabled for FID ${event.fid}`);
                }
                
                return NextResponse.json({ 
                    success: true,
                    message: 'Notifications disabled successfully' 
                });

            default:
                console.log('❓ Unknown event type:', eventType, event);
                return NextResponse.json({ 
                    success: true,
                    message: 'Event received but not handled' 
                });
        }

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return NextResponse.json({ 
            success: false,
            error: 'Internal error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 200 }); // Return 200 to prevent Base from retrying
    }
}
