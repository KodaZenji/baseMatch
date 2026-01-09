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
import { Heart, Menu, Moon, Sun, X, MessageCircle, Users, LayoutDashboard, Twitter, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BaseAppAutoConnect } from '@/components/BaseAppAutoConnect';

// Dark Mode Toggle Component
function DarkModeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors backdrop-blur-sm"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}

// Explore Menu (Connected Users)
function ExploreMenu({ isOpen, onClose, setActiveTab }: { 
  isOpen: boolean; 
  onClose: () => void;
  setActiveTab: (tab: 'browse' | 'matches' | 'profile' | 'notifications') => void;
}) {
  const handleNavClick = (tab: 'browse' | 'matches' | 'profile' | 'notifications') => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-200">Menu</h2>

          <nav className="space-y-4">
            <button
              onClick={() => handleNavClick('notifications')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Messages</span>
            </button>

            <button
              onClick={() => handleNavClick('matches')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Matches</span>
            </button>

            <button
              onClick={() => handleNavClick('profile')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            <a
              href="https://x.com/basematch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200"
            >
              <Twitter className="w-5 h-5" />
              <span className="font-medium">X.com</span>
            </a>

            <a
              href="https://discord.gg/vF7bZWhJ85"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Discord</span>
            </a>
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Report or send feedback</p>
          </div>
        </div>
      </div>
    </>
  );
}

// Landing Menu (Not Connected)
function LandingMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-200">Connect With Us</h2>

          <nav className="space-y-4">
            <a
              href="https://x.com/basematch_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
            >
              <Twitter className="w-6 h-6" />
              <div>
                <div className="font-semibold">Follow us on X</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">@basematch_</div>
              </div>
            </a>

            <a
              href="https://discord.gg/vF7bZWhJ85"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
            >
              <MessageSquare className="w-6 h-6" />
              <div>
                <div className="font-semibold">Join our Discord</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Community chat</div>
              </div>
            </a>
          </nav>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { profile, isLoading } = useProfile();
  
  const [activeTab, setActiveTab] = useState<'browse' | 'matches' | 'profile' | 'notifications'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('activeTab');
      if (savedTab === 'profile' || savedTab === 'browse' || savedTab === 'matches' || savedTab === 'notifications') {
        localStorage.removeItem('activeTab');
        return savedTab;
      }
    }
    return 'browse';
  });
  
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { unreadCount } = useNotifications({
    userAddress: address,
    autoRefresh: true
  });

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center transition-colors">
        <div className="text-white text-2xl">Loading profile...</div>
      </div>
    );
  }

  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="relative">
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
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">Loading Timeout</p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
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

  // Landing Page
  if (!isConnected || !profile?.exists) {
    return (
      <>
        <BaseAppAutoConnect />
        
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn relative border border-gray-200 dark:border-gray-700">
            {/* Dark Mode Toggle & Menu for Landing */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <DarkModeToggle isDark={isDark} onToggle={toggleDarkMode} />
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative">
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
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                BaseMatch
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Find Your Match On-Chain</p>
            </div>

            {isConnected && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">✓ Wallet Connected</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            )}

            <div className="mb-8">
              <p className="text-gray-700 dark:text-gray-300 mb-4 text-base">
                {isConnected 
                  ? "Ready to create your on-chain profile!"
                  : "Your wallet is your dating profile"
                }
              </p>
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2 border border-pink-200 dark:border-pink-900/30">
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
              {isConnected ? (
                <>
                  <button
                    onClick={() => router.push('/register/wallet/complete')}
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold 
                      transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02]
                      active:scale-[0.98] active:shadow-md"
                  >
                    Create Profile
                  </button>
                  <div className="relative flex items-center my-2">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <button
                    onClick={() => router.push('/register/email')}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold 
                      transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/50 hover:scale-[1.02]
                      active:scale-[0.98] active:shadow-md"
                  >
                    Sign Up with Email Instead
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <ConnectButton />
                  </div>
                  <div className="relative flex items-center my-2">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <button
                    onClick={() => router.push('/register/email')}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold 
                      transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/50 hover:scale-[1.02]
                      active:scale-[0.98] active:shadow-md"
                  >
                    Sign Up with Email
                  </button>
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 border-2 border-white dark:border-gray-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 border-2 border-white dark:border-gray-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-400 border-2 border-white dark:border-gray-800"></div>
                </div>
                <p className="font-medium">
                  Join <span className="text-purple-600 dark:text-purple-400 font-bold">500+</span> users finding love on Base
                </p>
              </div>
            </div>
          </div>
        </div>

        <LandingMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </>
    );
  }

  // Main App - Explore View with Glassmorphic Header/Nav
  return (
    <div className="min-h-screen transition-colors">
      {/* Glassmorphic Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <img
                src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw"
                alt="BaseMatch Logo"
                className="w-14 h-14"
              />
              <span className="hidden md:inline text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                BaseMatch
              </span>
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile/edit"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Edit Profile
              </Link>
              <DarkModeToggle isDark={isDark} onToggle={toggleDarkMode} />
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors backdrop-blur-sm"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Glassmorphic Navigation */}
      <nav className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'browse'
                ? 'border-pink-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              Browse
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'matches'
                ? 'border-pink-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                ? 'border-pink-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative transition-colors ${activeTab === 'notifications'
                ? 'border-pink-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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

      <ExploreMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
