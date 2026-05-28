/**
 * sendBaseNotification.ts
 
 * Migration: Neynar FID-token notifications → Base Dashboard wallet-address notifications
 * Old: farcaster_tokens table → Neynar API
 * New: wallet address → dashboard.base.org API (no token lookup needed)
 *
 * Setup:
 *   1. Register basematch.app at https://dashboard.base.org
 *   2. Go to Settings > API Key and generate a key
 *   3. Add BASE_NOTIFICATIONS_API_KEY to your .env.local ( Done ✅ this already, just keeping for reference)
 */

const BASE_APP_URL = 'https://basematch.app';
const BASE_DASHBOARD_API = 'https://dashboard.base.org/api/v1';

function getApiKey(): string | null {
  return process.env.BASE_NOTIFICATIONS_API_KEY || null;
}

/**
 * Check if a wallet address has opted in to notifications for BaseMatch.
 * Replaces the old farcaster_tokens table lookup.
 */
export async function checkBaseNotificationStatus(walletAddress: string): Promise<{
  appPinned: boolean;
  notificationsEnabled: boolean;
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('⚠️ BASE_NOTIFICATIONS_API_KEY not set');
    return { appPinned: false, notificationsEnabled: false };
  }

  const response = await fetch(`${BASE_DASHBOARD_API}/notifications/app/user/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      app_url: BASE_APP_URL,
      wallet_address: walletAddress,
    }),
  });

  if (!response.ok) {
    console.error('Failed to check notification status:', response.status);
    return { appPinned: false, notificationsEnabled: false };
  }

  return response.json();
}

/**
 * Send a push notification to a user by wallet address.
 **/
export async function sendBaseNotification(
  userAddress: string,
  title: string,
  body: string,
  targetUrl?: string
): Promise<{ success: boolean; reason?: string; data?: unknown; error?: unknown }> {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      console.warn('⚠️ BASE_NOTIFICATIONS_API_KEY not set — skipping push notification');
      return { success: false, reason: 'no_api_key' };
    }

    // Convert full URL to path if needed (Base API only accepts paths like "/matches")
    let targetPath = '/';
    if (targetUrl) {
      try {
        const url = new URL(targetUrl);
        targetPath = url.pathname || '/';
      } catch {
        // Already a path
        targetPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
      }
    }

    // Enforce Base API character limits
    const safeTitle = title.slice(0, 30);
    const safeBody = body.slice(0, 200);

    const response = await fetch(`${BASE_DASHBOARD_API}/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        app_url: BASE_APP_URL,
        wallet_addresses: [userAddress.toLowerCase()],
        title: safeTitle,
        message: safeBody,
        target_path: targetPath,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Base notification API error:', response.status, errorText);

      // Mirror the old Neynar failure reason format for easy drop-in
      return { success: false, reason: 'api_error' };
    }

    const result = await response.json();

    // result.results[0] will have failureReason if user hasn't opted in
    if (!result.success && result.failedCount > 0) {
      const failureReason = result.results?.[0]?.failureReason;
      console.log(`Notification not delivered to ${userAddress}: ${failureReason}`);
      return { success: false, reason: failureReason || 'delivery_failed' };
    }

    console.log('✅ Base notification sent successfully to:', userAddress);
    return { success: true, data: result };

  } catch (error) {
    console.error('Error sending Base notification:', error);
    return { success: false, reason: 'exception', error };
  }
}

/**
 * Send notifications to multiple wallet addresses at once.
 * Useful for broadcasting (e.g. new feature announcements).
 * Base API accepts up to 1,000 addresses per request.
 */
export async function sendBaseNotificationBulk(
  walletAddresses: string[],
  title: string,
  body: string,
  targetPath: string = '/'
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, sentCount: 0, failedCount: walletAddresses.length };
  }

  // Chunk into batches of 1000 (API limit)
  const chunks = [];
  for (let i = 0; i < walletAddresses.length; i += 1000) {
    chunks.push(walletAddresses.slice(i, i + 1000));
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const chunk of chunks) {
    const response = await fetch(`${BASE_DASHBOARD_API}/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        app_url: BASE_APP_URL,
        wallet_addresses: chunk.map(a => a.toLowerCase()),
        title: title.slice(0, 30),
        message: body.slice(0, 200),
        target_path: targetPath,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      totalSent += result.sentCount || 0;
      totalFailed += result.failedCount || 0;
    } else {
      totalFailed += chunk.length;
    }
  }

  return { success: totalSent > 0, sentCount: totalSent, failedCount: totalFailed };
}
