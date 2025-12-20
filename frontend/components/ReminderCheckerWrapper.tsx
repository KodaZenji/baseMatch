// File: frontend/components/ReminderCheckerWrapper.tsx
'use client';

import { useReminderChecker } from '@/hooks/useReminderChecker';

/**
 * Client component wrapper that runs the reminder checker
 * This component renders nothing but runs the reminder checker hook
 */
export default function ReminderCheckerWrapper() {
  useReminderChecker();
  return null;
}
