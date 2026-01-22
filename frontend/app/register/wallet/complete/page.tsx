'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart, Sparkles } from 'lucide-react';

export default function CompleteWalletProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const source = searchParams.get('source'); // 'farcaster', 'baseapp', or null

  const [formData, setFormData] = useState({
    name: '',
    birthYear: '',
    gender: '',
    interests: '',
    email: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSource, setProfileSource] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // ✅ State to keep imported profiles
  const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
  const [baseProfile, setBaseProfile] = useState<any>(null);

  // Consolidated logic for profile initialization
  useEffect(() => {
    if (!address) return;

    console.log('🔍 Initializing profile for:', address, 'Source:', source);

    const initializeData = () => {
      let finalAvatar = '';
      let isImported = false;

      // 1️⃣ Handle Farcaster Import
      if (source === 'farcaster') {
        const stored = localStorage.getItem('farcasterProfile');
        if (stored) {
          try {
            const profile = JSON.parse(stored);
            setFarcasterProfile(profile);
            setFormData(prev => ({
              ...prev,
              name: profile.displayName || profile.username || '',
              interests: profile.bio || '',
            }));
            const photoUrl = profile.photoUrl || profile.pfp_url || profile.pfp || '';
            if (photoUrl && photoUrl.trim() !== '') {
              finalAvatar = photoUrl;
              isImported = true;
              setProfileSource('farcaster');
            }
          } catch (err) {
            console.error('❌ Error parsing Farcaster profile:', err);
          }
        }
      }

      // 2️⃣ Handle Base App Import
      if (source === 'baseapp') {
        const stored = localStorage.getItem('baseProfile');
        if (stored) {
          try {
            const profile = JSON.parse(stored);
            setBaseProfile(profile);
            setFormData(prev => ({
              ...prev,
              name: profile.displayName || profile.username || '',
              interests: profile.bio || '',
            }));
            const photoUrl = profile.photoUrl || profile.pfpUrl || profile.pfp || '';
            if (photoUrl && photoUrl.trim() !== '') {
              finalAvatar = photoUrl;
              isImported = true;
              setProfileSource('baseapp');
            }
          } catch (err) {
            console.error('❌ Error parsing Base profile:', err);
          }
        }
      }

      // 3️⃣ Fallback avatar
      if (!finalAvatar) {
        console.log('🎨 Using dicebear fallback');
        const seed = address.substring(2, 10);
        finalAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
        setProfileSource(null);
      }

      setAvatarUrl(finalAvatar);
      setAvatarLoaded(isImported);
    };

    initializeData();
  }, [source, address]);

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (!isConnected) {
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
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-800 dark:text-gray-200 mb-6 font-semibold">Connect Your Wallet</p>
          <div className="flex justify-center mb-6">
            <ConnectButton />
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors font-medium"
          >
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  // ✅ Submit handler using state
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!address) throw new Error('Wallet not connected');

      if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests || !formData.email) {
        throw new Error('Please fill in all required fields');
      }

      const birthYear = parseInt(formData.birthYear);
      const currentYear = new Date().getFullYear();
      const calculatedAge = currentYear - birthYear;
      if (isNaN(birthYear) || calculatedAge < 18 || calculatedAge > 120) {
        throw new Error('Birth year must correspond to an age between 18 and 120');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // ✅ Read Farcaster/Base data from state
      let farcasterData = {
        farcasterVerified: false,
        farcasterUsername: null as string | null,
        farcasterFid: null as number | null,
      };

      if (source === 'farcaster' && farcasterProfile) {
        farcasterData = {
          farcasterVerified: true,
          farcasterUsername: farcasterProfile.username || null,
          farcasterFid: farcasterProfile.fid ? parseInt(farcasterProfile.fid) : null,
        };
      } else if (source === 'baseapp' && baseProfile) {
        farcasterData = {
          farcasterVerified: true,
          farcasterUsername: baseProfile.username || null,
          farcasterFid: baseProfile.fid ? parseInt(baseProfile.fid) : null,
        };
      }

      console.log('📤 Submitting profile registration:', {
        address,
        name: formData.name,
        hasAvatar: !!avatarUrl,
        avatarSource: avatarUrl?.includes('dicebear') ? 'dicebear fallback' : profileSource || 'manual',
        profileSource: profileSource || 'manual',
        ...farcasterData,
      });

      const response = await fetch('/api/profile/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          name: formData.name,
          birthYear: birthYear,
          gender: formData.gender,
          interests: formData.interests,
          email: formData.email,
          photoUrl: avatarUrl,
          profileSource: profileSource || 'manual',
          farcasterVerified: farcasterData.farcasterVerified,
          farcasterUsername: farcasterData.farcasterUsername,
          farcasterFid: farcasterData.farcasterFid,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // ✅ Only now clear localStorage
      localStorage.removeItem('farcasterProfile');
      localStorage.removeItem('baseProfile');

      const mintData = {
        profile_id: data.userInfo?.profileId,
        id: data.userInfo?.profileId,
        address: address,
        email: formData.email,
        registerWithWalletPayload: {
          name: formData.name,
          birthYear: birthYear,
          gender: formData.gender,
          interests: formData.interests,
          photoUrl: avatarUrl,
        },
        contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
      };

      localStorage.setItem('walletFirstMint', JSON.stringify(mintData));
      console.log('✅ Profile data saved to localStorage for minting');

      router.push('/register/wallet/mint');
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 py-8 transition-colors">
      <div className="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 dark:border-gray-700 my-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <Heart className="w-12 h-12" fill="url(#brandGradient2)" stroke="none" />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="brandGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Complete Your Profile
        </h1>
        
        {(profileSource === 'farcaster' || profileSource === 'baseapp') && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold">
              <Sparkles className="w-4 h-4" />
              {profileSource === 'baseapp' ? 'Imported from Base App' : 'Imported from Farcaster'}
            </span>
          </div>
        )}

        {/* FORM OMITTED FOR BREVITY - identical to your previous code */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* form fields here */}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/register/wallet/choice')}
            className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors font-medium"
          >
            ← Back to signup options
          </button>
        </div>
      </div>
    </div>
  );
}
