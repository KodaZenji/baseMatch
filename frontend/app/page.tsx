'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import BrowseProfiles from '@/components/BrowseProfiles';
import Matches from '@/components/Matches';
import Dashboard from '@/components/Dashboard';
import Notifications from '@/components/Notifications';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Heart, Menu, Moon, Sun, X, MessageCircle, Users,
  LayoutDashboard, Wallet, LogOut, Loader2, Trophy
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { GrNotification } from "react-icons/gr";
import { FaXTwitter } from 'react-icons/fa6';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BaseAppAutoConnect } from '@/components/BaseAppAutoConnect';
import RaceComingSoon from '@/components/RaceComingSoon';

const BLUE = '#0052FF';

// ── Wagmi wallet button — replaces RainbowKit <ConnectButton /> ───────────────
function WalletButton({ centered = false }: { centered?: boolean }) {
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
      {isPending
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Wallet className="w-4 h-4" />
      }
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

// ── Dark Mode Toggle ──────────────────────────────────────────────────────────
function DarkModeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full transition-all duration-300 hover:bg-white/10"
      aria-label="Toggle dark mode"
    >
      {isDark
        ? <Sun className="w-5 h-5 text-yellow-400" />
        : <Moon className="w-5 h-5 text-white/90" />
      }
    </button>
  );
}

// ── Explore Menu (Connected Users) ────────────────────────────────────────────
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
                <span className="font-bold block">"Contests"</span>
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

// ── Landing Menu (Not Connected) ──────────────────────────────────────────────
function LandingMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="fixed top-0 right-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 z-50">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-200">Connect With Us</h2>
          <nav className="space-y-4">
            <a href="https://x.com/basematch_" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              <FaXTwitter className="w-5 h-5" />
              <div><div className="font-semibold">Follow us on X</div><div className="text-xs text-gray-500">@basematch_</div></div>
            </a>
            <a href="https://discord.gg/vF7bZWhJ85" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              <FaDiscord className="w-5 h-5" />
              <div><div className="font-semibold">Join the Community</div><div className="text-xs text-gray-500">BaseMatch Discord</div></div>
            </a>
          </nav>
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

  const { unreadCount } = useNotifications({ userAddress: address, autoRefresh: true });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
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
      const timer = setTimeout(() => setLoadingTimeout(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading profile...</div>
      </div>
    );
  }

  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/95 dark:bg-gray-900/95 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <Heart className="w-12 h-12 mx-auto mb-6" fill="#C11C84" stroke="none" />
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">BaseMatch</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">Loading Timeout</p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">There was an issue loading your profile. Please try refreshing.</p>
          <button onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ── Landing Page (not connected / no profile) ─────────────────────────────
  if (!isConnected || !profile?.exists) {
    return (
      <>
        <BaseAppAutoConnect />

        <div className="min-h-screen transition-colors duration-700 relative overflow-hidden" style={{
          background: isDark ? '#05060f' : 'linear-gradient(to bottom right, #6366f1, #3b82f6, #6366f1)'
        }}>
          {isDark && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, #0052FF 0%, #5B8DEE 50%, transparent 70%)', left: '10%', top: '20%', animation: 'float 6s ease-in-out infinite' }} />
              <div className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
                style={{ background: 'radial-gradient(circle, #A259FF 0%, #7B3FF2 50%, transparent 70%)', right: '10%', bottom: '20%', animation: 'float 6s ease-in-out infinite', animationDelay: '-3s' }} />
              <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
                style={{ background: 'radial-gradient(circle, #FF00C7 0%, #ec4899 50%, transparent 70%)', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animation: 'float 6s ease-in-out infinite', animationDelay: '-1.5s' }} />
            </div>
          )}

          {/* Header */}
          <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${isDark ? 'bg-black/40 backdrop-blur-2xl border-b border-white/5' : 'bg-white/80 backdrop-blur-2xl border-b border-white/20'}`}>
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <img src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw" alt="BaseMatch Logo" className="w-10 h-10" />
              <div className="flex items-center gap-4">
                <DarkModeToggle isDark={isDark} onToggle={toggleDarkMode} />
                <button onClick={() => setIsMenuOpen(true)}
                  className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'hover:bg-white/10' : 'hover:bg-white/20'}`}>
                  <Menu className={`w-5 h-5 ${isDark ? 'text-white' : 'text-white/90'}`} />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-16 relative z-10">
            <div className={`mb-8 px-4 py-2 rounded-full backdrop-blur-sm ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/20 border border-white/30'}`}>
              <p className={`text-sm font-bold tracking-wider uppercase ${isDark ? 'text-blue-400' : 'text-white'}`}>
                Bringing verified Web3 dating to Base
              </p>
            </div>

            <div className={`max-w-md w-full rounded-3xl p-8 text-center transition-all duration-700 ${isDark ? 'bg-[#0a0b14]/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-blue-500/10' : 'bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200'}`}>

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className={`rounded-full p-3 shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
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

              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                BaseMatch
              </h1>
              <p className={`text-lg font-medium mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                Find Your Match On-Chain
              </p>

              {/* Connected status */}
              {isConnected && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>✓ Wallet Connected</p>
                  <p className={`text-xs font-mono mt-1 ${isDark ? 'text-blue-400/40' : 'text-blue-600'}`}>
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
              )}

              <p className={`mb-4 text-base ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>
                {isConnected ? "Ready to create your on-chain profile!" : "Your wallet is your dating profile"}
              </p>

              {/* Features list */}
              <div className={`rounded-xl p-4 text-sm space-y-2 mb-8 text-left ${isDark ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>✓</span>
                  <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>No bots. Every profile is a wallet.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-blue-500'}`}>✓</span>
                  <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>Build your rep through real connections</span>
                </div>
                
              </div>

              {/* ── CTAs ── */}
              <div className="space-y-3">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => router.push('/register/wallet/choice')}
                      className="w-full py-3 rounded-xl font-bold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #FF00C7 0%, #0052FF 100%)',
                        boxShadow: isDark ? '0 10px 25px rgba(0, 82, 255, 0.25)' : '0 10px 25px rgba(168, 85, 247, 0.3)'
                      }}
                    >
                      Create Profile
                    </button>
                    <div className="relative flex items-center my-2">
                      <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-300'}`} />
                      <span className={`mx-4 text-xs font-bold ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>OR</span>
                      <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-300'}`} />
                    </div>
                    <button
                      onClick={() => router.push('/register/email')}
                      className={`w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02] ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                    >
                      Sign Up with Email
                    </button>
                  </>
                ) : (
                  <>
                    {/* ✅ REPLACED: <ConnectButton /> → wagmi WalletButton centered */}
                    <WalletButton centered />

                    <div className="relative flex items-center my-2">
                      <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-300'}`} />
                      <span className={`mx-4 text-xs font-bold ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>OR</span>
                      <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-300'}`} />
                    </div>
                    <button
                      onClick={() => router.push('/register/email')}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Sign Up with Email
                    </button>
                  </>
                )}
              </div>

              {/* Footer stats */}
              <div className={`mt-8 pt-6 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="flex -space-x-2">
                    {['from-blue-500/30 to-purple-500/30', 'from-purple-500/30 to-pink-500/30', 'from-pink-500/30 to-blue-500/30'].map((g, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 ${isDark ? `border-[#0a0b14] bg-gradient-to-br ${g}` : 'border-white bg-gradient-to-br from-pink-400 to-purple-400'}`} />
                    ))}
                  </div>
                  <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Join <span className="font-bold text-blue-500">500+</span> users finding love on Base
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>

        <LandingMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </>
    );
  }

  // ── Main App (connected + has profile) ────────────────────────────────────
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
              {/* ✅ REPLACED: <ConnectButton /> → wagmi WalletButton */}
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Nav */}
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

      {/* Mobile Bottom Nav */}
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
