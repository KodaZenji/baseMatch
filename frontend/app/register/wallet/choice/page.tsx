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
          const isInMiniApp = await sdk.isInMiniApp();
          
          if (isInMiniApp) {
            const context = await sdk.context;
            
            if (context && context.user) {
              // 🛠️ FIX: Cast to any to bypass TS error on .bio and .location
              const user = context.user as any;
              
              console.log('🎉 Profile from Context API:', {
                fid: user.fid,
                username: user.username,
                displayName: user.displayName,
                pfpUrl: user.pfpUrl, 
                bio: user.bio,
              });

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
              
              setTimeout(() => {
                setAutoChecking(false);
              }, 1000);
            } else {
              setAutoChecking(false);
            }
          } else {
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

  const handleBaseAccountSignup = async () => {
    setChecking(true);
    setError('');

    try {
      const isInMiniApp = await sdk.isInMiniApp();
      
      if (!isInMiniApp) {
        throw new Error('Not in Mini App environment. Please open in Base App.');
      }

      const context = await sdk.context;
      
      if (!context || !context.user) {
        throw new Error('Could not get user context');
      }

      // 🛠️ FIX: Cast to any to bypass TS error
      const user = context.user as any;

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
      setChecking(false);
    }
  };

  // ... rest of the file (handleFarcasterSignup, handleManualSignup, and JSX) remains the same
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
          photoUrl: data.profile.photoUrl || data.profile.pfp_url || '',
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
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Loading Your Profile...</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Getting your Base Account info</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 relative">
        <button onClick={() => window.history.back()} className="absolute top-4 left-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
            <svg width="0" height="0"><defs><linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs></svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">How do you want to sign up?</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">Choose your signup method</p>
        {(isBaseApp || baseAccountProfile) && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-2 border-blue-400 rounded-xl p-4 text-sm">
            <p className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Base Account Detected!</p>
            <p className="text-blue-700 dark:text-blue-300">{baseAccountProfile?.avatar ? '🎨 Profile ready with your avatar!' : 'Your profile is ready to import!'}</p>
          </div>
        )}
        <div className="space-y-4">
          <button onClick={handleBaseAccountSignup} disabled={checking} className={`w-full p-6 rounded-2xl border-2 transition-all ${isBaseApp ? 'border-blue-400 bg-blue-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4 text-left">
                  <span className="text-3xl">🔵</span>
                  <div>
                    <h3 className="font-bold text-lg">Base Account {isSmartWallet && '⚡'}</h3>
                    <p className="text-sm text-gray-600">{baseAccountProfile?.displayName ? `Welcome, ${baseAccountProfile.displayName}!` : 'Use your Base identity'}</p>
                  </div>
               </div>
               {checking ? <Loader2 className="animate-spin" /> : <span>→</span>}
            </div>
          </button>
          <button onClick={handleFarcasterSignup} className="w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
             <div className="flex items-center gap-4 text-left">
                <SiFarcaster className="w-7 h-7 text-purple-600" />
                <div>
                  <h3 className="font-bold text-lg">Use Farcaster</h3>
                  <p className="text-sm text-gray-600">Import your Farcaster profile</p>
                </div>
             </div>
             <span>→</span>
          </button>
          <button onClick={handleManualSignup} className="w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
             <div className="flex items-center gap-4 text-left">
                <Edit3 className="text-gray-500" />
                <div>
                  <h3 className="font-bold text-lg">Sign Up Manually</h3>
                  <p className="text-sm text-gray-600">Fill out the form yourself</p>
                </div>
             </div>
             <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
