// File: frontend/hooks/useReminderChecker.ts

import { useEffect, useRef } from 'react';

/**
 * Hook to periodically check and send confirmation reminders
 * Runs in the background whenever the app is open
 */
export function useReminderChecker() {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Check immediately on mount (but only once per session)
    if (!hasCheckedRef.current) {
      checkReminders();
      hasCheckedRef.current = true;
    }

    // Then check every 5 minutes
    const interval = setInterval(() => {
      checkReminders();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const checkReminders = async () => {
    try {
      const response = await fetch('/api/stakes/check-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success && data.remindersSent > 0) {
        console.log(`📬 Sent ${data.remindersSent} confirmation reminders`);
      }
    } catch (error) {
      // Silently fail - this is a background task
      console.error('Failed to check reminders:', error);
    }
  };
}
