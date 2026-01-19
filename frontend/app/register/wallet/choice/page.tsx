'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, Edit3 } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';

export default function SignupChoicePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  // Redirect if wallet not connected
  useEffect(() => {
    if (!isConnected) router.push('/');
  }, [isConnected, router]);

  // Farcaster signup (via your API)
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
        localStorage.setItem('farcasterProfile', JSON.stringify(data.profile));
        router.push('/register/wallet/complete?source=farcaster');
      } else {
        router.push('/register/wallet/complete');
      }
    } catch (err) {
      console.error('Error checking Farcaster:', err);
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  // Base Mini App signup
  const handleBaseAppSignup = async () => {
    setChecking(true);
    setError('');
    try {
      // Small delay to ensure window is ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      const isMiniApp = typeof (window as any).BaseMiniApp !== 'undefined';
      const context = isMiniApp ? (window as any).BaseMiniApp.context : null;

      console.log('🔍 Base Mini App detection:', { isMiniApp, context });

      if (isMiniApp && context?.user) {
        const miniAppProfile = {
          username: context.user.username || 'user',
          displayName: context.user.displayName || context.user.username || 'User',
          name: context.user.displayName || context.user.username || 'User',
          photoUrl: context.user.pfpUrl || '',
          pfp: context.user.pfpUrl || '',
          pfp_url: context.user.pfpUrl || '',
          avatar: context.user.pfpUrl || '',
          bio: context.user.bio || '',
          description: context.user.bio || '',
          fid: context.user.fid || '',
          address,
        };

        console.log('📦 Storing Mini App profile:', miniAppProfile);
        localStorage.setItem('baseAppProfile', JSON.stringify(miniAppProfile));
        router.push('/register/wallet/complete?source=miniapp');
      } else {
        console.log('⚠️ Not in Base Mini App context or user not available, fallback');
        router.push('/register/wallet/complete');
      }
    } catch (err) {
      console.error('Error checking Base Mini App:', err);
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  // Manual signup
  const handleManualSignup = () => {
    router.push('/register/wallet/complete');
  };

  // Render UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 relative">

        {/* Back Arrow */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors backdrop-blur-sm group"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          How do you want to sign up?
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">Choose your signup method</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Farcaster Option */}
          <button
            onClick={handleFarcasterSignup}
            disabled={checking}
            className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-purple-300/30 dark:border-purple-500/20 text-gray-800 dark:text-gray-100 p-6 rounded-2xl hover:bg-white/20 dark:hover:bg-white/10 hover:border-purple-400/40 dark:hover:border-purple-400/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 dark:bg-purple-500/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <SiFarcaster className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Farcaster</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Import your Farcaster profile</p>
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
              ) : (
                <span className="text-2xl text-gray-600 dark:text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Base Mini App Option */}
          <button
            onClick={handleBaseAppSignup}
            disabled={checking}
            className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-blue-300/30 dark:border-blue-500/20 text-gray-800 dark:text-gray-100 p-6 rounded-2xl hover:bg-white/20 dark:hover:bg-white/10 hover:border-blue-400/40 dark:hover:border-blue-400/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 dark:bg-blue-500/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">🟦</span>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Base Profile</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Import from Base.app</p>
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <span className="text-2xl text-gray-600 dark:text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Manual Option */}
          <button
            onClick={handleManualSignup}
            disabled={checking}
            className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-gray-300/30 dark:border-gray-500/20 text-gray-800 dark:text-gray-100 p-6 rounded-2xl hover:bg-white/20 dark:hover:bg-white/10 hover:border-gray-400/40 dark:hover:border-gray-400/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-500/20 dark:bg-gray-500/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Sign Up Manually</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fill out the form yourself</p>
                </div>
              </div>
              <span className="text-2xl text-gray-600 dark:text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Connected Wallet Info */}
        {address && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
