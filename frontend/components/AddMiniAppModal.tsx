'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { X, Heart, MessageCircle, Bell } from 'lucide-react';

// ✅ MIGRATED: sdk.actions.addMiniApp() removed — deprecated after April 9
// Notification opt-in now handled via Base Dashboard API
// Users enable notifications through the Base App natively;
// we just check their status and store the result locally.

interface AddMiniAppModalProps {
  trigger?: 'manual' | 'after-match' | 'after-browse';
  onClose?: () => void;
}

export default function AddMiniAppModal({ trigger = 'manual', onClose }: AddMiniAppModalProps) {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const alreadyAdded = localStorage.getItem('basematch_miniapp_added');
    if (alreadyAdded) {
      setIsAdded(true);
      return;
    }

    const dismissed = localStorage.getItem('basematch_miniapp_dismissed');
    if (dismissed) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (parseInt(dismissed) > oneDayAgo) return;
    }

    if (trigger === 'after-match') {
      setTimeout(() => setIsOpen(true), 1000);
    } else if (trigger === 'after-browse') {
      setTimeout(() => setIsOpen(true), 5000);
    } else {
      setIsOpen(true);
    }
  }, [trigger]);

  async function handleEnableNotifications() {
    if (!address) return;
    setIsLoading(true);

    try {
      // Check if user has already opted in to Base notifications
      // The Base App handles the actual opt-in UI natively —
      // we just record the status on our end.
      const res = await fetch('/api/notifications/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      });

      const data = await res.json();

      if (data.notificationsEnabled) {
        localStorage.setItem('basematch_notifications_enabled', 'true');
        console.log('✅ Base notifications already enabled for:', address);
      } else {
        // Notifications not yet enabled — user needs to enable them
        // in the Base App. We still mark as "added" so we don't re-prompt.
        localStorage.setItem('basematch_notifications_enabled', 'false');
        console.log('ℹ️ Notifications not yet enabled — user can enable in Base App settings');
      }

      localStorage.setItem('basematch_miniapp_added', 'true');
      setIsAdded(true);

      setTimeout(() => {
        setIsOpen(false);
        onClose?.();
      }, 2000);

    } catch (error) {
      console.error('Failed to check notification status:', error);
      // Non-fatal — still mark as added so we don't spam the modal
      localStorage.setItem('basematch_miniapp_added', 'true');
      setIsAdded(true);
      setTimeout(() => {
        setIsOpen(false);
        onClose?.();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('basematch_miniapp_dismissed', Date.now().toString());
    setIsOpen(false);
    onClose?.();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-pink-600 via-purple-600 to-blue-600 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 duration-300 relative">

        {!isAdded ? (
          <>
            {/* Close */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-full p-6 border border-white/20">
                <Bell className="w-16 h-16 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white text-center mb-3">
              Never Miss a Match!
            </h2>
            <p className="text-white/90 text-center mb-8 text-lg">
              Enable notifications to stay in the loop
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/10 rounded-full p-2 flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">New Matches</div>
                  <div className="text-sm text-white/80">Get notified instantly when someone matches with you</div>
                </div>
              </div>

              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/10 rounded-full p-2 flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">New Messages</div>
                  <div className="text-sm text-white/80">Never miss a conversation with your matches</div>
                </div>
              </div>

              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/10 rounded-full p-2 flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Delivered via Base App</div>
                  <div className="text-sm text-white/80">Notifications powered by the Base notification system</div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="w-full bg-white text-purple-900 font-bold py-4 px-6 rounded-xl hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Setting up...
                  </span>
                ) : (
                  '🔔 Enable Notifications'
                )}
              </button>

              <button
                onClick={handleDismiss}
                disabled={isLoading}
                className="w-full bg-transparent text-white/80 font-medium py-3 px-6 rounded-xl hover:bg-white/5 transition-colors border border-white/20"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-white/60 text-center mt-6">
              Manage notification preferences anytime in the Base app
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 rounded-full p-6">
                <Heart className="w-16 h-16 text-white" fill="white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">All Set! 🎉</h2>
            <p className="text-white/90 text-lg">
              You'll receive notifications for new matches and messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
