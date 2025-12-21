// File: frontend/hooks/useReminderChecker.ts

import { useEffect, useRef } from 'react';

// Global flag to ensure only one reminder checker runs per session
let isCheckingReminders = false;
let lastCheckTime = 0;
const MIN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between checks

/**
 * Hook to periodically check and send confirmation reminders
 * Runs in the background whenever the app is open
 */
export function useReminderChecker() {
  useEffect(() => {
    // Check immediately on mount (but only once per session)
    if (!isCheckingReminders) {
      isCheckingReminders = true;
      checkReminders();
    }

    // Then check every 5 minutes
    const interval = setInterval(() => {
      checkReminders();
    }, MIN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const checkReminders = async () => {
    const now = Date.now();

    // Prevent checking too frequently
    if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
      return;
    }

    lastCheckTime = now;

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