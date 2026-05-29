// hooks/useUnreadCount.ts
// Lightweight polling-only hook for the notification badge in page.tsx
// Does NOT create a Supabase Realtime channel — avoids duplicate channel conflict
// with useNotifications used inside Notifications.tsx

import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 30_000;

export function useUnreadCount(userAddress?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    async function fetchCount() {
      try {
        const res = await fetch(
          `/api/notifications?userAddress=${encodeURIComponent(userAddress!)}&onlyUnread=true&limit=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      } catch {
        // silent — badge just won't update
      }
    }

    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userAddress]);

  return { unreadCount };
}
