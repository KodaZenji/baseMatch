'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BrowseProfiles from '@/components/BrowseProfiles';
import Matches from '@/components/Matches';
import Dashboard from '@/components/Dashboard';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<'browse' | 'matches' | 'profile'>('browse');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Handle loading timeout
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading state while fetching profile
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // If loading timed out, show an error
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
            💖 BaseMatch
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

  // If user not connected, show welcome page with signup options
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
              💖 BaseMatch
            </h1>
            <p className="text-gray-600 text-lg">Your Web3 Dating App</p>
          </div>

          <div className="mb-8">
            <p className="text-gray-700 mb-4">
              Connect your wallet to start matching on Base blockchain.
            </p>
            <div className="bg-pink-50 rounded-xl p-4 text-sm text-gray-600">
              ✓ Your wallet is your identity<br />
              ✓ Build real-world reputation<br />
              ✓ Optional staking for serious dates
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/register/wallet')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
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
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Sign Up with Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user connected but no profile, redirect to profile edit to create one
  if (!profile?.exists) {
    router.push('/profile/edit');
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-2xl">Redirecting to profile setup...</div>
      </div>
    );
  }

  // Show main dashboard if user is connected and has a profile
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              💖 BaseMatch
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

      {/* Navigation */}
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && <BrowseProfiles />}
        {activeTab === 'matches' && <Matches />}
        {activeTab === 'profile' && <Dashboard />}
      </main>
    </div>
  );
}