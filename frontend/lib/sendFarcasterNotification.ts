import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function sendFarcasterNotification(
  userAddress: string,
  title: string,
  body: string,
  targetUrl?: string
) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get the user's Farcaster notification token
    const { data: tokenData, error: tokenError } = await supabase
      .from('farcaster_tokens')
      .select('token, notification_url')
      .eq('user_address', userAddress.toLowerCase())
      .eq('enabled', true)
      .single();
    
    if (tokenError || !tokenData) {
      console.log('No Farcaster token found for user:', userAddress);
      return { success: false, reason: 'no_token' };
    }

    // Send notification via Neynar
    const response = await fetch('https://api.neynar.com/v2/farcaster/app/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY!,
        'x-farcaster-app-token': tokenData.token
      },
      body: JSON.stringify({
        title,
        body,
        targetUrl: targetUrl || process.env.NEXT_PUBLIC_APP_URL,
        tokens: [tokenData.token]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Neynar notification failed:', errorText);
      return { success: false, reason: 'api_error' };
    }

    const result = await response.json();
    console.log('Notification sent successfully:', result);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending Farcaster notification:', error);
    return { success: false, reason: 'exception', error };
  }
}
