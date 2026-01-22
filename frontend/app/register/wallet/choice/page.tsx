'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Edit3, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';
import { sdk } from '@farcaster/miniapp-sdk';

export default function SignupChoicePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const [showFarcasterModal, setShowFarcasterModal] = useState(false);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [fid, setFid] = useState('');
  const [username, setUsername] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
  const [baseProfile, setBaseProfile] = useState<any>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isInBaseApp, setIsInBaseApp] = useState(false);

  // Check if running in Base app
  useEffect(() => {
    async function checkBaseApp() {
      const inBaseApp = await sdk.isInMiniApp();
      setIsInBaseApp(inBaseApp);
      console.log('Running in Base app:', inBaseApp);
    }
    checkBaseApp();
  }, []);

  // Dark mode initialization
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

  const handleBaseAppSignup = async () => {
    setShowBaseModal(true);
    setError('');
    setIsVerifying(true);

    try {
      // Get Base app context
      const context = await sdk.context;
      
      console.log('Base app context:', context);

      if (!context?.user) {
        setError('Could not fetch Base profile. Please try another method.');
        setIsVerifying(false);
        return;
      }

      const user = context.user;

      // Create profile from Base app data
      const profile = {
        displayName: user.displayName || user.username || 'Base User',
        username: user.username || `user${user.fid}`,
        bio: '',
        fid: user.fid,
        photoUrl: user.pfpUrl || '',
        pfpUrl: user.pfpUrl || '',
        pfp: user.pfpUrl || '',
      };

      setBaseProfile(profile);

      // Save to localStorage
      localStorage.setItem('baseProfile', JSON.stringify(profile));
      
      console.log('✅ Base profile saved:', profile);

      // Navigate to complete page
      setTimeout(() => {
        router.push('/register/wallet/complete?source=baseapp');
      }, 1500);

    } catch (error) {
      console.error('Base app signup error:', error);
      setError('Failed to fetch Base profile. Please try another signup method.');
      setIsVerifying(false);
    }
  };

  const handleFarcasterVerify = async () => {
    if (!fid || !username) {
      setError('Please enter both FID and username');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/verify-farcaster-fid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          fid: fid.trim(),
          username: username.trim().toLowerCase().replace('@', ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        setIsVerifying(false);
        return;
      }

      if (data.verified && data.profile) {
        setFarcasterProfile(data.profile);
        
        localStorage.setItem('farcasterProfile', JSON.stringify({
          displayName: data.profile.displayName || data.profile.username,
          username: data.profile.username,
          bio: data.profile.bio || '',
          fid: fid.trim(),
          photoUrl: data.profile.pfp || '',
          pfp_url: data.profile.pfp || '',
          pfp: data.profile.pfp || '',
        }));
        
        console.log('✅ Farcaster profile saved:', data.profile);
        
        setTimeout(() => {
          router.push('/register/wallet/complete?source=farcaster');
        }, 1500);
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
      setIsVerifying(false);
    }
  };

  const handleManualSignup = () => {
    router.push('/register/wallet/complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          How do you want to sign up?
        </h1>
        
        <p className="text-center text-gray-800 dark:text-gray-300 text-sm mb-8 font-medium">
          Choose your signup method
        </p>

        <div className="space-y-4">
          
          {/* Base App Button - Only show if in Base app */}
          {isInBaseApp && (
            <button 
              onClick={handleBaseAppSignup}
              className="w-full p-6 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400">
                    🟦
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Use Base Profile</h3>
                    <p className="text-sm text-gray-800 dark:text-gray-300">signup with BaseApp account</p>
                  </div>
                </div>
                <span className="text-gray-500 dark:text-gray-400 text-xl">→</span>
              </div>
            </button>
          )}

          {/* Farcaster Button */}
          <button 
            onClick={() => setShowFarcasterModal(true)}
            className="w-full p-6 rounded-xl border-2 border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <SiFarcaster className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Use Farcaster</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-300">Sign up with Farcaster account</p>
                </div>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-xl">→</span>
            </div>
          </button>

          {/* Manual Button */}
          <button 
            onClick={handleManualSignup}
            className="w-full p-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <Edit3 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Sign Up Manually</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-300">Fill out the form yourself</p>
                </div>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-xl">→</span>
            </div>
          </button>

        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors font-medium"
          >
            ← Back to home
          </button>
        </div>
      </div>

      {/* Base App Success Modal */}
      {showBaseModal && baseProfile && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle className="w-16 h-16 text-blue-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Profile Loaded! 🎉
              </h3>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5 my-6">
                <div className="flex items-center gap-4 mb-3">
                  {baseProfile.photoUrl && (
                    <img
                      src={baseProfile.photoUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-2 border-blue-300 dark:border-blue-600"
                    />
                  )}
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      {baseProfile.displayName}
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-300">
                      @{baseProfile.username}
                    </p>
                    {baseProfile.fid && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                        FID: {baseProfile.fid}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-400 mb-4 font-medium">
                Redirecting to complete your profile...
              </p>

              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Farcaster Verification Modal */}
      {showFarcasterModal && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl">
            
            {farcasterProfile ? (
              // Success State
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Profile Verified! 🎉
                </h3>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-5 my-6">
                  <div className="flex items-center gap-4 mb-3">
                    <img
                      src={farcasterProfile.pfp}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-2 border-purple-300 dark:border-purple-600"
                    />
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        @{farcasterProfile.username}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-300">
                        {farcasterProfile.displayName}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                        FID: {fid}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-400 mb-4 font-medium">
                  Redirecting to complete your profile...
                </p>

                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : (
              // Input State
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Onboard with Farcaster Account
                  </h3>
                  <button
                    onClick={() => {
                      setShowFarcasterModal(false);
                      setError('');
                      setFid('');
                      setUsername('');
                    }}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm text-gray-800 dark:text-gray-300 mb-6 font-medium">
                  Enter your Farcaster FID and username to verify your account
                </p>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{error}</p>
                      {attemptsLeft !== null && (
                        <p className="text-xs mt-1 font-semibold">Attempts remaining: {attemptsLeft}/3</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Farcaster FID
                    </label>
                    <input
                      type="text"
                      value={fid}
                      onChange={(e) => setFid(e.target.value)}
                      placeholder="e.g., 12345"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Farcaster Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., username"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-medium"
                    />
                    <p className="text-xs text-gray-700 dark:text-gray-400 mt-2 font-medium">
                      Enter without the @ symbol
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleFarcasterVerify}
                    disabled={isVerifying || !fid || !username}
                    className="w-full py-3 text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Account'
                    )}
                  </button>

                  <a
                    href="https://warpcast.com/~/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 underline font-semibold"
                  >
                    Find your FID in Farcaster settings →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
