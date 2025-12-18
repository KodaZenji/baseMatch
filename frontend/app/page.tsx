'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BrowseProfiles from '@/components/BrowseProfiles';
import Matches from '@/components/Matches';
import Dashboard from '@/components/Dashboard';
import Notifications from '@/components/Notifications';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<'browse' | 'matches' | 'profile' | 'notifications'>('browse');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const { unreadCount } = useNotifications({
    userAddress: address,
    autoRefresh: true
  });

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-white rounded-full p-3 shadow-lg">
                <Heart
                  className="w-12 h-12"
                  fill="url(#brandGradient)"
                  stroke="none"
                />
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
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-600 text-lg mb-4">Loading Timeout</p>
          <p className="text-gray-700 mb-6">
            There was an issue loading your profile. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-white rounded-full p-3 shadow-lg">
                <Heart
                  className="w-12 h-12"
                  fill="url(#brandGradient)"
                  stroke="none"
                />
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
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              BaseMatch
            </h1>
            <p className="text-gray-600 text-lg font-medium">Find Your Match On-Chain</p>
          </div>

          <div className="mb-8">
            <p className="text-gray-700 mb-4 text-base">
              Your wallet is your dating profile. Build real reputation, meet real people.
            </p>
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Wallet = Your Identity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Build Real-World Reputation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Optional Staking For Serious Dates</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/register/wallet')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold 
                transition-all duration-200
                hover:shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02]
                active:scale-[0.98] active:shadow-md"
            >
              Connect Wallet
            </button>
            <div className="relative flex items-center my-2">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <button
              onClick={() => router.push('/register/email')}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold 
                transition-all duration-200
                hover:shadow-lg hover:shadow-teal-500/50 hover:scale-[1.02]
                active:scale-[0.98] active:shadow-md"
            >
              Sign Up with Email
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-400 border-2 border-white"></div>
              </div>
              <p className="font-medium">
                Join <span className="text-purple-600 font-bold">500+</span> users finding love on Base
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.exists) {
    router.push('/profile/edit');
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-2xl">Redirecting to profile setup...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <img
                src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw"
                alt="BaseMatch Logo"
                className="w-14 h-14"
              />
              <span className="hidden md:inline text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                BaseMatch
              </span>
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile/edit"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit Profile
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'browse'
                ? 'border-pink-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Browse
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'matches'
                ? 'border-pink-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile'
                ? 'border-pink-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${activeTab === 'notifications'
                ? 'border-pink-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && <BrowseProfiles />}
        {activeTab === 'matches' && <Matches />}
        {activeTab === 'profile' && <Dashboard />}
        {activeTab === 'notifications' && <Notifications />}
      </main>
    </div>
  );
}
