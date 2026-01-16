// app/register/wallet/choice/page.tsx - WITH REACT ICONS

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, Edit3 } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';

export default function SignupChoicePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  if (!isConnected) {
    router.push('/');
    return null;
  }

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
        // Found Farcaster - store and redirect
        localStorage.setItem('farcasterProfile', JSON.stringify(data.profile));
        router.push('/register/wallet/complete?source=farcaster');
      } else {
        // No Farcaster found - silently revert to manual
        router.push('/register/wallet/complete');
      }
    } catch (error) {
      console.error('Error checking Farcaster:', error);
      router.push('/register/wallet/complete');
    }
  };

  const handleBaseAppSignup = async () => {
    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/check-baseapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (data.exists && data.profile) {
        // Found Base App profile
        localStorage.setItem('baseAppProfile', JSON.stringify(data.profile));
        router.push('/register/wallet/complete?source=baseapp');
      } else {
        // No Base App profile - silently revert to manual
        router.push('/register/wallet/complete');
      }
    } catch (error) {
      console.error('Error checking Base App:', error);
      router.push('/register/wallet/complete');
    }
  };

  const handleManualSignup = () => {
    router.push('/register/wallet/complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full p-3 shadow-lg">
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
        <p className="text-gray-600 text-center mb-8">Choose your signup method</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Farcaster Option */}
          <button
            onClick={handleFarcasterSignup}
            disabled={checking}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <SiFarcaster className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Farcaster</h3>
                  <p className="text-sm text-purple-100">Import your Farcaster profile</p>
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Base App / Basename Option */}
          <button
            onClick={handleBaseAppSignup}
            disabled={checking}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🟦</span>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Basename</h3>
                  <p className="text-sm text-blue-100">Have a .base.eth name? Import it</p>
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Manual Option */}
          <button
            onClick={handleManualSignup}
            disabled={checking}
            className="w-full bg-white border-2 border-gray-300 text-gray-800 p-6 rounded-2xl hover:border-gray-400 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Sign Up Manually</h3>
                  <p className="text-sm text-gray-600">Don't have these yet? Fill form manually</p>
                </div>
              </div>
              <span className="text-2xl text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Connected Wallet Info */}
        {address && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
