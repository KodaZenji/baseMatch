'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Edit3, Loader2, AlertCircle, CheckCircle, Hexagon } from 'lucide-react';

export default function SignupChoicePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [showBaseModal, setShowBaseModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [baseProfile, setBaseProfile] = useState<any>(null);

  // Dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
  }, []);

  if (!isConnected) {
    router.push('/');
    return null;
  }

  // ── Import Basename profile ──────────────────────────────────────────────
  const handleBaseImport = async () => {
    setShowBaseModal(true);
    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/import-base-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (response.status === 404) {
        setError('No Basename found for this wallet. Try signing up manually.');
        setIsVerifying(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Import failed. Try again.');
        setIsVerifying(false);
        return;
      }

      if (data.verified && data.profile) {
        const profile = {
          displayName: data.profile.displayName,
          username: data.profile.basename,
          bio: data.profile.bio || '',
          photoUrl: data.profile.pfp || '',
          pfpUrl: data.profile.pfp || '',
          pfp: data.profile.pfp || '',
        };

        setBaseProfile(profile);
        localStorage.setItem('baseProfile', JSON.stringify(profile));

        setTimeout(() => {
          router.push('/register/wallet/complete?source=baseapp');
        }, 1500);
      }
    } catch {
      setError('Network error. Please try again.');
      setIsVerifying(false);
    }
  };

  const handleManualSignup = () => {
    router.push('/register/wallet/complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <img src="/bmg_new_logo.png" alt="BaseMatch" className="w-10 h-10 object-contain" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-white/80">
          How do you want to sign up?
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-8">
          Choose your signup method
        </p>

        <div className="space-y-4">

          {/* Option 1 — Import Base Profile (Basename) */}
          <button
            onClick={handleBaseImport}
            className="w-full p-6 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-500 transition-all shadow-sm hover:shadow-md text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Hexagon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    Import Base Profile
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Auto-fill from your Basename
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-xl">→</span>
            </div>
          </button>

          {/* Option 2 — Manual */}
          <button
            onClick={handleManualSignup}
            className="w-full p-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-md text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    Sign Up Manually
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fill out the form yourself
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-xl">→</span>
            </div>
          </button>

        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>

      {/* Base Import Modal — Loading */}
      {showBaseModal && isVerifying && !baseProfile && !error && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Looking up your Basename...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Resolving onchain identity for<br />
              <span className="font-mono text-xs">{address}</span>
            </p>
          </div>
        </div>
      )}

      {/* Base Import Modal — Success */}
      {showBaseModal && baseProfile && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl text-center">
            <CheckCircle className="w-14 h-14 text-blue-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Basename Found! 🎉
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5 my-5 flex items-center gap-4 text-left">
              {baseProfile.photoUrl && (
                <img
                  src={baseProfile.photoUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full border-2 border-blue-300 dark:border-blue-600 flex-shrink-0"
                />
              )}
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                  {baseProfile.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {baseProfile.username}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to complete your profile...
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto mt-3" />
          </div>
        </div>
      )}

      {/* Base Import Modal — Error */}
      {showBaseModal && error && !baseProfile && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl text-center">
            <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              No Basename Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowBaseModal(false);
                  setError('');
                }}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={handleManualSignup}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Sign Up Manually →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
