'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, Edit3, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { sdk } from "@farcaster/miniapp-sdk";

export default function SignupChoicePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isBaseApp, isSmartWallet } = useBaseAccount();
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const [error, setError] = useState('');
  const [baseAccountProfile, setBaseAccountProfile] = useState<any>(null);

  // 1. SIGNAL SDK READY (Crucial for button responsiveness in Base App)
  useEffect(() => {
    const signalReady = async () => {
      try {
        if (await sdk.isInMiniApp()) {
          sdk.actions.ready();
        }
      } catch (e) {
        console.error("SDK Ready failed", e);
      }
    };
    signalReady();
  }, []);

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  // 🎯 AUTO-CHECK Logic
  useEffect(() => {
    const autoCheckBaseAccount = async () => {
      if (!address || !isConnected) {
        setAutoChecking(false);
        return;
      }

      if (isBaseApp) {
        try {
          const isInMiniApp = await sdk.isInMiniApp();
          if (isInMiniApp) {
            const context = await sdk.context;
            if (context && context.user) {
              const user = context.user as any; // TS FIX
              
              const profile = {
                fid: user.fid,
                username: user.username || address.slice(0, 8),
                displayName: user.displayName || user.username || 'Base User',
                bio: user.bio || '',
                description: user.bio || '',
                avatar: user.pfpUrl || '',
                photoUrl: user.pfpUrl || '',
                pfp: user.pfpUrl || '',
                pfp_url: user.pfpUrl || '',
                address,
                location: user.location,
                isBaseAccount: true,
                isSmartWallet: isSmartWallet,
                profileSource: 'context-api',
              };

              setBaseAccountProfile(profile);
            }
          }
        } catch (error) {
          console.error('❌ Context API failed:', error);
        } finally {
          setTimeout(() => setAutoChecking(false), 1000);
        }
      } else {
        setAutoChecking(false);
      }
    };
    autoCheckBaseAccount();
  }, [address, isConnected, isBaseApp, isSmartWallet]);

  // 2. THE BUTTON HANDLER (Uses your exact logic)
  const handleBaseAccountSignup = async () => {
    setChecking(true);
    setError('');

    try {
      const isInMiniApp = await sdk.isInMiniApp();
      if (!isInMiniApp) throw new Error('Not in Mini App environment. Please open in Base App.');

      const context = await sdk.context;
      if (!context || !context.user) throw new Error('Could not get user context');

      const user = context.user as any; // TS FIX

      const profile = {
        fid: user.fid,
        username: user.username || address?.slice(0, 8) || 'user',
        displayName: user.displayName || user.username || 'Base User',
        bio: user.bio || '',
        description: user.bio || '',
        avatar: user.pfpUrl || '',
        photoUrl: user.pfpUrl || '',
        pfp: user.pfpUrl || '',
        pfp_url: user.pfpUrl || '',
        address,
        location: user.location,
        isBaseAccount: true,
        isSmartWallet: isSmartWallet,
        profileSource: 'context-api',
      };

      localStorage.setItem('baseAppProfile', JSON.stringify(profile));
      router.push('/register/wallet/complete?source=baseaccount');
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to get profile');
      setChecking(false); // Enable button if it fails
    }
  };

  const handleFarcasterSignup = async () => {
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/check-farcaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      if (data.exists && data.profile) {
        localStorage.setItem('farcasterProfile', JSON.stringify({
          displayName: data.profile.displayName || data.profile.username,
          username: data.profile.username,
          bio: data.profile.bio || '',
          fid: data.profile.fid,
          followerCount: data.profile.followerCount || 0,
          photoUrl: data.profile.photoUrl || data.profile.pfp_url || data.profile.pfp || '',
          pfp_url: data.profile.pfp_url || data.profile.photoUrl || data.profile.pfp || '',
          pfp: data.profile.pfp || data.profile.photoUrl || data.profile.pfp_url || '',
        }));
        router.push('/register/wallet/complete?source=farcaster');
      } else {
        router.push('/register/wallet/complete');
      }
    } catch (error) {
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  const handleManualSignup = () => router.push('/register/wallet/complete');

  if (!isConnected) {
    router.push('/');
    return null;
  }

  if (autoChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Loading Your Profile...</h2>
          <p className="text-gray-600 text-sm">Getting your Base Account info</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">How do you want to sign up?</h1>
        <div className="space-y-4 mt-8">
          <button
            onClick={handleBaseAccountSignup}
            disabled={checking}
            className={`w-full p-6 rounded-2xl border-2 transition-all ${(isBaseApp || baseAccountProfile) ? 'border-blue-400 bg-blue-500/10' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <span className="text-3xl">🔵</span>
                <div>
                  <h3 className="font-bold">Base Account {isSmartWallet && '⚡'}</h3>
                  <p className="text-sm text-gray-600">{baseAccountProfile?.displayName || 'Use your Base identity'}</p>
                </div>
              </div>
              {checking ? <Loader2 className="animate-spin text-blue-500" /> : <span>→</span>}
            </div>
          </button>

          <button onClick={handleFarcasterSignup} className="w-full p-6 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
            <div className="flex items-center gap-4 text-left">
              <SiFarcaster className="w-7 h-7 text-purple-600" />
              <div><h3 className="font-bold">Use Farcaster</h3><p className="text-sm text-gray-600">Import your Farcaster profile</p></div>
            </div>
            <span>→</span>
          </button>

          <button onClick={handleManualSignup} className="w-full p-6 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
            <div className="flex items-center gap-4 text-left">
              <Edit3 className="text-gray-500" />
              <div><h3 className="font-bold text-gray-500">Sign Up Manually</h3><p className="text-sm text-gray-600">Fill out the form yourself</p></div>
            </div>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
