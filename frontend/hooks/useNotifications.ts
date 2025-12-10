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
    // Message notifications
    sender_address?: string;
    message_id?: string;
    user1_address?: string;
    user2_address?: string;
    // Match notifications
    match_address?: string;
    match_name?: string;
    // Profile update notifications
    profile_id?: string;
    is_new?: boolean;
    updated_field?: string;
    updated_fields?: {
      name?: boolean;
      age?: boolean;
      gender?: boolean;
      interests?: boolean;
      photoUrl?: boolean;
    };
    new_interests?: string;
  };
  created_at: string;
}

interface UseNotificationsProps {
  userAddress?: string;
  autoRefresh?: boolean;
}

export function useNotifications({ 
  userAddress, 
  autoRefresh = true 
}: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const realtimeChannelRef = useRef<any>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/notifications?userAddress=${encodeURIComponent(userAddress)}&limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

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

  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      if (!userAddress || notificationIds.length === 0) return false;

      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationIds,
            userAddress
          })
        });

        if (!response.ok) {
          throw new Error('Failed to mark notifications as read');
        }

        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notificationIds.includes(notif.id) ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));

        return true;
      } catch (err) {
        console.error('Error marking notifications as read:', err);
        return false;
      }
    },
    [userAddress]
  );

  const clearRead = useCallback(async () => {
    if (!userAddress) return false;

    try {
      const response = await fetch(
        `/api/notifications?userAddress=${encodeURIComponent(userAddress)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }

      setNotifications(prev => prev.filter(n => !n.read));
      return true;
    } catch (err) {
      console.error('Error clearing notifications:', err);
      return false;
    }
  }, [userAddress]);

  // Set up realtime subscription
  useEffect(() => {
    if (!userAddress || !autoRefresh) return;

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
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          // Recalculate unread count
          setNotifications(current => {
            const newUnreadCount = current.filter(n => !n.read).length;
            setUnreadCount(newUnreadCount);
            return current;
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabaseClient.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [userAddress, autoRefresh, fetchNotifications]);

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
