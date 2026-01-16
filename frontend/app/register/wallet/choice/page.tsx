// app/register/wallet/choice/page.tsx 

'use client';

import { useState, useEffect } from 'react';
import { Heart, Loader2, Edit3, Moon, Sun } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';

export default function SignupChoicePage() {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  
  // Mock data for preview
  const address = '0x1234...5678';
  const isConnected = true;

  // Dark mode initialization (read-only, set from landing page)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleFarcasterSignup = async () => {
    setChecking(true);
    setError('');
    // Simulate API call
    setTimeout(() => {
      setChecking(false);
      alert('Farcaster signup selected!');
    }, 1500);
  };

  const handleBaseAppSignup = async () => {
    setChecking(true);
    setError('');
    // Simulate API call
    setTimeout(() => {
      setChecking(false);
      alert('Basename signup selected!');
    }, 1500);
  };

  const handleManualSignup = () => {
    alert('Manual signup selected!');
  };

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
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 text-white p-6 rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <SiFarcaster className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Farcaster</h3>
                  <p className="text-sm text-purple-100 dark:text-purple-200">Import your Farcaster profile</p>
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white p-6 rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">🟦</span>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Use Basename</h3>
                  <p className="text-sm text-blue-100 dark:text-blue-200">Have a .base.eth name? Import it</p>
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Manual Option - Now professionally clean */}
          <button
            onClick={handleManualSignup}
            disabled={checking}
            className="w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-2xl hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                  <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Sign Up Manually</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fill out the form yourself</p>
                </div>
              </div>
              <span className="text-2xl text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Connected Wallet Info */}
        {address && isConnected && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Connected: {address}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
