'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { X, Heart, MessageCircle, Users, Bell } from 'lucide-react';

interface AddMiniAppModalProps {
  trigger?: 'manual' | 'after-match' | 'after-browse';
  onClose?: () => void;
}

export default function AddMiniAppModal({ trigger = 'manual', onClose }: AddMiniAppModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    // Check if already added
    const alreadyAdded = localStorage.getItem('basematch_miniapp_added');
    if (alreadyAdded) {
      setIsAdded(true);
      return;
    }

    // Check if dismissed recently (within 24 hours)
    const dismissed = localStorage.getItem('basematch_miniapp_dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (dismissedTime > oneDayAgo) {
        return; // Don't show if dismissed within last 24 hours
      }
    }

    // Show based on trigger
    if (trigger === 'after-match') {
      // Show immediately after match
      setTimeout(() => setIsOpen(true), 1000);
    } else if (trigger === 'after-browse') {
      // Show after 5 seconds of browsing
      setTimeout(() => setIsOpen(true), 5000);
    } else if (trigger === 'manual') {
      setIsOpen(true);
    }
  }, [trigger]);

  async function handleAddMiniApp() {
    setIsLoading(true);
    
    try {
      // SDK is already initialized in providers.tsx
      const response = await sdk.actions.addMiniApp();
      
      if (response.notificationDetails) {
        console.log("✅ Notifications enabled!", response.notificationDetails);
        localStorage.setItem('basematch_miniapp_added', 'true');
        localStorage.setItem('basematch_notifications_enabled', 'true');
        
        // Store the token in your backend
        await fetch('/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'miniapp_added',
            notificationDetails: response.notificationDetails
          })
        }).catch(err => console.error('Failed to store token:', err));
      } else {
        console.log("⚠️ Added without notifications");
        localStorage.setItem('basematch_miniapp_added', 'true');
        localStorage.setItem('basematch_notifications_enabled', 'false');
      }
      
      setIsAdded(true);
      setTimeout(() => {
        setIsOpen(false);
        onClose?.();
      }, 2000);
      
    } catch (error) {
      console.error("Failed to add mini app:", error);
      alert("Something went wrong. Please try again.");
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
            {/* Close button */}
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

            {/* Title */}
            <h2 className="text-3xl font-bold text-white text-center mb-3">
              Never Miss a Match!
            </h2>

            {/* Description */}
            <p className="text-white/90 text-center mb-8 text-lg">
              Pin BaseMatch to get instant notifications
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 text-white">
                <div className="bg-white/10 rounded-full p-2 flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">New Matches</div>
                  <div className="text-sm text-white/80">Get notified instantly when someone shows interest back</div>
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
                  <Users className="w-5 h-5" />
                </div>
                <div>
          
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddMiniApp}
                disabled={isLoading}
                className="w-full bg-white text-purple-900 font-bold py-4 px-6 rounded-xl hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </span>
                ) : (
                  '📌 Pin BaseMatch & Enable Notifications'
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

            {/* Fine print */}
            <p className="text-xs text-white/60 text-center mt-6">
              Manage notification preferences anytime in the Base app
</p>
          </>
        ) : (
          // Success state
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 rounded-full p-6">
                <Heart className="w-16 h-16 text-white" fill="white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              All Set! 🎉
            </h2>
            <p className="text-white/90 text-lg">
              You'll now receive notifications for new matches and messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
