'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import BrowseProfiles from '@/components/BrowseProfiles';
import Matches from '@/components/Matches';
import Dashboard from '@/components/Dashboard';
import Notifications from '@/components/Notifications';
import { useProfile } from '@/hooks/useProfile';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import {
  Heart, Menu, Moon, Sun, X, MessageCircle, Users,
  LayoutDashboard, Wallet, LogOut, Loader2, Trophy
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { GrNotification } from 'react-icons/gr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BaseAppAutoConnect } from '@/components/BaseAppAutoConnect';
import RaceComingSoon from '@/components/RaceComingSoon';
import LandingPage from '@/components/landing/LandingPage';

const BLUE = '#0052FF';

// ── Wallet button (used in app header) ───────────────────────────────────────
export function WalletButton({ centered = false }: { centered?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${centered ? 'justify-center' : ''}`}>
        <span className="text-xs font-mono text-gray-400 bg-white/6 border border-white/10 px-3 py-2 rounded-xl hidden sm:block">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 text-xs transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-50 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg ${centered ? 'mx-auto' : ''}`}
      style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

// ── Explore Menu (connected users) ───────────────────────────────────────────
function ExploreMenu({ isOpen, onClose, setActiveTab }: {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: 'browse' | 'matches' | 'profile' | 'notifications' | 'race') => void;
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavClick = (tab: 'browse' | 'matches' | 'profile' | 'notifications' | 'race') => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="fixed top-0 right-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-50">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-200">Menu</h2>
          <nav className="space-y-4">
            <button onClick={() => handleNavClick('notifications')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200">
              <MessageCircle className="w-5 h-5" /><span className="font-medium">Messages</span>
            </button>
            <button onClick={() => handleNavClick('matches')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200">
              <Users className="w-5 h-5" /><span className="font-medium">Matches</span>
            </button>
            <button onClick={() => handleNavClick('race')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-700">
              <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div className="text-left">
                <span className="font-bold block">Contests</span>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">Coming Soon ✨</span>
              </div>
            </button>
            <button onClick={() => handleNavClick('profile')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200">
              <LayoutDashboard className="w-5 h-5" /><span className="font-medium">Dashboard</span>
            </button>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            <a href="https://x.com/basematch" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200">
              <FaXTwitter className="w-5 h-5" /><span className="font-medium">X.com</span>
            </a>
            <a href="https://discord.gg/vF7bZWhJ85" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-200">
              <FaDiscord className="w-5 h-5" /><span className="font-medium">Discord</span>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { profile, isLoading } = useProfile();

  const [activeTab, setActiveTab] = useState<'browse' | 'matches' | 'profile' | 'notifications' | 'race'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('activeTab');
      if (['profile', 'browse', 'matches', 'notifications', 'race'].includes(savedTab || '')) {
        localStorage.removeItem('activeTab');
        return savedTab as any;
      }
    }
    return 'browse';
  });

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => { setIsMenuOpen(false); }, []);
  useEffect(() => {
    if (isConnected && profile?.exists) setIsMenuOpen(false);
  }, [isConnected, profile?.exists]);

  const { unreadCount } = useUnreadCount(address);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Loading spinner while profile fetches
  if (isConnected && isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Loading timeout fallback
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <Heart className="w-12 h-12 mx-auto mb-6" fill="#C11C84" stroke="none" />
          <h1 className="text-2xl font-bold mb-2 text-white">Loading Timeout</h1>
          <p className="text-gray-400 mb-6">There was an issue loading your profile. Please try refreshing.</p>
          <button onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF00C7 0%, #0052FF 100%)' }}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ── Landing (not connected or no profile) ────────────────────────────────
  if (!isConnected || (!isLoading && !profile?.exists)) {
    return (
      <>
        <BaseAppAutoConnect />
        <LandingPage isDark={isDark} toggleDarkMode={toggleDarkMode} />
      </>
    );
  }

  // ── Main App (connected + has profile) ───────────────────────────────────
  return (
    <div className="min-h-screen transition-colors">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <img src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw" alt="BaseMatch Logo" className="w-14 h-14" />
              <span className="hidden md:inline text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                BaseMatch
              </span>
            </h1>
            <div className="flex items-center space-x-4">
              <Link href="/profile/edit" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium transition-colors">
                Edit Profile
              </Link>
              <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      <nav className="desktop-nav bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {(['browse', 'matches', 'race', 'profile', 'notifications'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize relative ${
                  activeTab === tab
                    ? 'border-pink-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }`}>
                {tab === 'race' ? (
                  <span className="flex items-center gap-1">Race <Trophy className="w-4 h-4 text-yellow-500" /></span>
                ) : tab === 'notifications' ? (
                  <>
                    Notifications
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </>
                ) : tab === 'profile' ? 'Dashboard' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && <BrowseProfiles />}
        {activeTab === 'matches' && <Matches />}
        {activeTab === 'race' && <RaceComingSoon />}
        {activeTab === 'profile' && <Dashboard />}
        {activeTab === 'notifications' && <Notifications />}
      </main>

      <nav className="mobile-bottom-nav">
        {([
          { tab: 'browse', icon: <Users className="w-5 h-5" /> },
          { tab: 'matches', icon: <Heart className="w-5 h-5" /> },
          { tab: 'race', icon: <Trophy className="w-5 h-5" /> },
          { tab: 'notifications', icon: <GrNotification className="w-5 h-5" /> },
          { tab: 'profile', icon: <LayoutDashboard className="w-5 h-5" /> },
        ] as const).map(({ tab, icon }) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`mobile-nav-btn ${activeTab === tab ? 'text-pink-500 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {icon}
            {tab === 'notifications' && unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <ExploreMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} setActiveTab={setActiveTab} />
    </div>
  );
}
