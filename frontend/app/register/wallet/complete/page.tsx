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
  const source = searchParams.get('source'); // 'farcaster' or null

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
  const [farcasterData, setFarcasterData] = useState<{username: string, fid: string} | null>(null);

  // Consolidated logic for profile initialization
  useEffect(() => {
    if (!address) return;

    console.log('🔍 Initializing profile for:', address, 'Source:', source);

    const initializeData = () => {
      let finalAvatar = '';
      let isFarcaster = false;

      // 1. Handle Farcaster Import
      if (source === 'farcaster') {
        const stored = localStorage.getItem('farcasterProfile');
        if (stored) {
          try {
            const profile = JSON.parse(stored);
            console.log('✅ Found Farcaster data:', profile);

            setFormData(prev => ({
              ...prev,
              name: profile.displayName || profile.username || '',
              interests: profile.bio || '',
            }));

            // Store Farcaster username and FID
            setFarcasterData({
              username: profile.username,
              fid: profile.fid
            });

            const photoUrl = profile.photoUrl || profile.pfp_url || profile.pfp || '';
            if (photoUrl && photoUrl.trim() !== '') {
              finalAvatar = photoUrl;
              isFarcaster = true;
              setProfileSource('farcaster');
            }
            // Clear storage after successful extraction
            localStorage.removeItem('farcasterProfile');
          } catch (err) {
            console.error('❌ Error parsing Farcaster profile:', err);
          }
        }
      }

      // 2. Generate Dicebear Fallback if no avatar was found from Farcaster
      if (!finalAvatar) {
        console.log('🎨 Using dicebear fallback');
        const seed = address.substring(2, 10);
        finalAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
        setProfileSource(null);
      }

      // 3. Batch state updates
      setAvatarUrl(finalAvatar);
      setAvatarLoaded(isFarcaster);
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

      console.log('📤 Submitting profile registration:', {
        address,
        name: formData.name,
        hasAvatar: !!avatarUrl,
        avatarSource: avatarUrl?.includes('dicebear') ? 'dicebear fallback' : profileSource || 'manual',
        profileSource: profileSource || 'manual',
        farcasterData: farcasterData,
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
          farcasterVerified: profileSource === 'farcaster' && farcasterData !== null,
          farcasterUsername: farcasterData?.username || null,
          farcasterFid: farcasterData?.fid || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

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
        
        {profileSource === 'farcaster' && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold">
              <Sparkles className="w-4 h-4" />
              Imported from Farcaster
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* ---------- UPDATED AVATAR SECTION ---------- */}
          <div className="flex justify-center">
            {avatarUrl && (
              <div className="text-center">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-purple-300 dark:border-purple-700 mb-1 shadow-lg"
                  onError={(e) => {
                    console.error('❌ Avatar failed to load, using dicebear fallback');
                    if (address) {
                      const seed = address.substring(2, 10);
                      e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                    }
                  }}
                />
                {profileSource === 'farcaster' && avatarLoaded ? (
                  <p className="text-[10px] text-gray-700 dark:text-gray-400 font-semibold">
                    Farcaster avatar
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-700 dark:text-gray-400 italic">
                    We generated a custom beautiful pixel art for you. Change it anytime in profile settings.
                  </p>
                )}
              </div>
            )}
          </div>
          {/* ---------- END AVATAR SECTION ---------- */}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Your name"
            />
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Birth Year *</label>
            <select
              value={formData.birthYear}
              onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
              required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors font-medium"
            >
              <option value="">Select birth year</option>
              {Array.from({ length: 83 }, (_, i) => {
                const currentYear = new Date().getFullYear();
                const year = currentYear - 18 - i;
                const age = currentYear - year;
                return (
                  <option key={year} value={year}>
                    {year} ({age} years old)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Gender *</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors font-medium"
            >
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Interests *</label>
            <textarea
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              required
              rows={3}
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors resize-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Hiking, Photography, Crypto..."
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-lg"
          >
            {isLoading ? 'Processing...' : 'Continue to Mint →'}
          </button>
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
