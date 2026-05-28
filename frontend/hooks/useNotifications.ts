import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  user_address: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: {
    sender_address?: string;
    message_id?: string;
    user1_address?: string;
    user2_address?: string;
    match_address?: string;
    match_name?: string;
    profile_id?: string;
    is_new?: boolean;
    updated_field?: string;
    updated_fields?: {
      name?: boolean;
      birthYear?: boolean;
      gender?: boolean;
      interests?: boolean;
      photoUrl?: boolean;
    };
    new_interests?: string;
    stake_id?: string;
    stake_amount?: string;
    meeting_timestamp?: number;
    sender_name?: string;
    outcome?: string;
    payout_amount?: string;
    i_showed_up?: boolean;
    they_showed_up?: boolean;
    hours_since_meeting?: number;
    acceptor_address?: string;
  };
  created_at: string;
}

interface UseNotificationsProps {
  userAddress?: string;
  autoRefresh?: boolean;
}

const POLL_INTERVAL_MS = 30_000; // 30s polling fallback when realtime drops

export function useNotifications({
  userAddress,
  autoRefresh = true
}: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realtimeChannelRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeActiveRef = useRef(false); // tracks if realtime is healthy

  const fetchNotifications = useCallback(async () => {
    if (!userAddress) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/notifications?userAddress=${encodeURIComponent(userAddress)}&limit=50`
      );
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!userAddress || notificationIds.length === 0) return false;
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, userAddress })
      });
      if (!response.ok) throw new Error('Failed to mark notifications as read');
      setNotifications(prev =>
        prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      return true;
    } catch (err) {
      console.error('Error marking as read:', err);
      return false;
    }
  }, [userAddress]);

  const clearRead = useCallback(async () => {
    if (!userAddress) return false;
    try {
      const response = await fetch(
        `/api/notifications?userAddress=${encodeURIComponent(userAddress)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to clear notifications');
      setNotifications(prev => prev.filter(n => !n.read));
      return true;
    } catch (err) {
      console.error('Error clearing notifications:', err);
      return false;
    }
  }, [userAddress]);

  // ── Start polling fallback ─────────────────────────────────────────────────
  // Called when realtime is unhealthy or drops on poor connections (e.g. 3G/Brave)
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return; // already polling
    console.log('📡 Realtime unavailable — switching to polling fallback');
    pollTimerRef.current = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);
  }, [fetchNotifications]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Realtime + polling setup ───────────────────────────────────────────────
  useEffect(() => {
    if (!userAddress || !autoRefresh) return;

    // Initial fetch
    fetchNotifications();

    const channel = supabaseClient
      .channel(`notifications:${userAddress.toLowerCase()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_address=eq.${userAddress.toLowerCase()}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_address=eq.${userAddress.toLowerCase()}`
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev => {
            const next = prev.map(n => n.id === updated.id ? updated : n);
            setUnreadCount(next.filter(n => !n.read).length);
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime is healthy — stop polling if it was running
          realtimeActiveRef.current = true;
          stopPolling();
          console.log('✅ Realtime notifications active');
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Realtime dropped — start polling so notifications still update
          realtimeActiveRef.current = false;
          startPolling();
          console.warn(`⚠️ Realtime ${status} — polling fallback active`);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      stopPolling();
      if (realtimeChannelRef.current) {
        supabaseClient.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [userAddress, autoRefresh, fetchNotifications, startPolling, stopPolling]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    clearRead
  };
}
