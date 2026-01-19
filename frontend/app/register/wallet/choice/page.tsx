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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

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
        localStorage.setItem('farcasterProfile', JSON.stringify(data.profile));
        router.push('/register/wallet/complete?source=farcaster');
      } else {
        router.push('/register/wallet/complete');
      }
    } catch (err) {
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  const handleBaseAppSignup = async () => {
    setChecking(true);
    try {
      // 1. Detect Base Mini App Injected SDK
      const baseApp = (window as any).BaseMiniApp;
      const context = baseApp?.context;

      if (context?.user) {
        const profile = {
          displayName: context.user.displayName || context.user.username || 'Base User',
          bio: context.user.bio || '',
          pfp: context.user.pfpUrl || '',
          address
        };
        localStorage.setItem('baseAppProfile', JSON.stringify(profile));
        router.push('/register/wallet/complete?source=baseapp');
      } else {
        // Fallback to manual if not inside Base Browser
        router.push('/register/wallet/complete');
      }
    } catch (err) {
      router.push('/register/wallet/complete');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 relative">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          How do you want to sign up?
        </h1>
        <div className="space-y-4 mt-8">
          <button onClick={handleFarcasterSignup} disabled={checking} className="w-full bg-white/10 border border-purple-300/30 p-6 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all">
            <div className="flex items-center gap-4">
               <SiFarcaster className="w-7 h-7 text-purple-600" />
               <div className="text-left"><h3 className="font-bold">Use Farcaster</h3><p className="text-sm opacity-70">Import profile</p></div>
            </div>
            {checking ? <Loader2 className="animate-spin" /> : "→"}
          </button>

          <button onClick={handleBaseAppSignup} disabled={checking} className="w-full bg-white/10 border border-blue-300/30 p-6 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all">
            <div className="flex items-center gap-4">
               <span className="text-2xl">🟦</span>
               <div className="text-left"><h3 className="font-bold">Use Base Profile</h3><p className="text-sm opacity-70">Import from Base.app</p></div>
            </div>
            {checking ? <Loader2 className="animate-spin" /> : "→"}
          </button>

          <button onClick={() => router.push('/register/wallet/complete')} className="w-full bg-white/10 border border-gray-300/30 p-6 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all">
            <div className="flex items-center gap-4">
               <Edit3 className="w-6 h-6" />
               <div className="text-left"><h3 className="font-bold">Manual</h3><p className="text-sm opacity-70">Fill form</p></div>
            </div>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
