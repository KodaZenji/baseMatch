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
  const { isBaseApp, isSmartWallet, capabilities } = useBaseAccount();
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const [error, setError] = useState('');
  const [baseAccountProfile, setBaseAccountProfile] = useState<any>(null);

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 🎯 AUTO-CHECK: Use Context API ONLY to get full profile with PFP!
  useEffect(() => {
    const autoCheckBaseAccount = async () => {
      if (!address || !isConnected) {
        setAutoChecking(false);
        return;
      }

      if (isBaseApp) {
        console.log('🚀 Auto-checking Base Account via Context API...');
        
        try {
          // Check if we're in a Mini App
          const isInMiniApp = await sdk.isInMiniApp();
          
          if (isInMiniApp) {
            // Get context - THIS HAS THE PFP!
            const context = await sdk.context;
            
            if (context && context.user) {
              const user = context.user;
              
              console.log('🎉 Profile from Context API:', {
                fid: user.fid,
                username: user.username,
                displayName: user.displayName,
                pfpUrl: user.pfpUrl,  // 🎯 YOUR ANIME PFP!
                bio: user.bio,
              });

              const profile = {
                fid: user.fid,
                username: user.username || address.slice(0, 8),
                displayName: user.displayName || user.username || 'Base User',
                bio: user.bio || '',
                description: user.bio || '',
                // 🎯 THE MAGIC: Map pfpUrl to all avatar fields
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
              
              console.log('✅ Profile loaded with avatar:', user.pfpUrl ? 'YES! 🎨' : 'No avatar (will use dicebear)');
              
              setTimeout(() => {
                setAutoChecking(false);
              }, 1000);
            } else {
              console.log('⚠️ No user in context');
              setAutoChecking(false);
            }
          } else {
            console.log('⚠️ Not in Mini App environment');
            setAutoChecking(false);
          }
        } catch (error) {
          console.error('❌ Context API failed:', error);
          setAutoChecking(false);
        }
      } else {
        setAutoChecking(false);
      }
    };

    autoCheckBaseAccount();
  }, [address, isConnected, isBaseApp, isSmartWallet]);

  if (!isConnected) {
    router.push('/');
    return null;
  }

  const handleBaseAccountSignup = async () => {
    setChecking(true);
    setError('');

    try {
      console.log('🔍 Getting Base Account profile from Context API...');

      const isInMiniApp = await sdk.isInMiniApp();
      
      if (!isInMiniApp) {
        throw new Error('Not in Mini App environment. Please open in Base App.');
      }

      const context = await sdk.context;
      
      if (!context || !context.user) {
        throw new Error('Could not get user context');
      }

      const user = context.user;
      
      console.log('✅ Context API profile:', {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        hasPfp: !!user.pfpUrl,
        hasBio: !!user.bio,
      });

      const profile = {
        fid: user.fid,
        username: user.username || address?.slice(0, 8) || 'user',
        displayName: user.displayName || user.username || 'Base User',
        bio: user.bio || '',
        description: user.bio || '',
        // Map pfpUrl to all avatar fields
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

      console.log('📦 Storing profile:', {
        hasAvatar: !!profile.avatar,
        avatarUrl: profile.avatar ? profile.avatar.substring(0, 50) + '...' : 'none',
        source: 'context-api',
      });

      localStorage.setItem('baseAppProfile', JSON.stringify(profile));
      
      router.push('/register/wallet/complete?source=baseaccount');
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to get profile');
      setChecking(false);
    }
  };

  const handleFarcasterSignup = async () => {
    setChecking(true);
    setError('');

    try {
      console.log('🔍 Checking Farcaster account for:', address);

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
      console.error('❌ Error checking Farcaster:', error);
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  const handleManualSignup = () => {
    router.push('/register/wallet/complete');
  };

  // Show loading while auto-checking
  if (autoChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Loading Your Profile...
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Getting your Base Account info
          </p>
        </div>
      </div>
    );
  }

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

        {/* Base Account Detected */}
        {(isBaseApp || baseAccountProfile) && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-400 dark:border-blue-500 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-pulse" />
              <div className="text-sm flex-1">
                <p className="font-bold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2">
                  Base Account Detected!
                  {baseAccountProfile?.username && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      @{baseAccountProfile.username}
                    </span>
                  )}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {baseAccountProfile?.avatar 
                    ? '🎨 Profile ready with your avatar!' 
                    : 'Your profile is ready to import!'
                  }
                </p>
                {isSmartWallet && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Smart Wallet • Gasless transactions
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Base Account Option */}
          <button
            onClick={handleBaseAccountSignup}
            disabled={checking}
            className={`w-full backdrop-blur-lg text-gray-800 dark:text-gray-100 p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden ${
              (isBaseApp || baseAccountProfile)
                ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 dark:from-blue-500/20 dark:to-indigo-500/20 border-2 border-blue-400 dark:border-blue-500 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40'
                : 'bg-white/10 dark:bg-white/5 border border-blue-300/30 dark:border-blue-500/20 hover:bg-white/20 dark:hover:bg-white/10 hover:border-blue-400/40 dark:hover:border-blue-400/30 hover:shadow-xl'
            }`}
          >
            {(isBaseApp || baseAccountProfile) && (
              <div className="absolute -top-1 -right-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  RECOMMENDED
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all ${
                  (isBaseApp || baseAccountProfile)
                    ? 'bg-blue-500/40 dark:bg-blue-500/30 scale-110' 
                    : 'bg-blue-500/20 dark:bg-blue-500/10'
                }`}>
                  <span className="text-3xl">🔵</span>
                </div>
                <div className="text-left">
                  <h3 className={`font-bold text-lg ${(isBaseApp || baseAccountProfile) ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                    Base Account {isSmartWallet && '⚡'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {baseAccountProfile?.displayName 
                      ? `Welcome, ${baseAccountProfile.displayName}!` 
                      : 'Use your Base identity'
                    }
                  </p>
                  {baseAccountProfile && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      ✓ Profile found • Click to continue
                    </p>
                  )}
                </div>
              </div>
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <span className="text-2xl text-gray-600 dark:text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
              )}
            </div>
          </button>

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
                  <h3 className="font-bold text-gray-500 text-lg">Sign Up Manually</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fill out the form yourself</p>
                </div>
              </div>
              <span className="text-2xl text-gray-600 dark:text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {address && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            {isBaseApp && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                ✓ Base App Environment
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
