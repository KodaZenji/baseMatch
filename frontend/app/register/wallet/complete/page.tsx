// app/register/wallet/complete/page.tsx 

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
    const source = searchParams.get('source'); // 'farcaster', 'baseaccount', or null

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
    const [baseAccountInfo, setBaseAccountInfo] = useState<any>(null);

    // FIXED: Load profile - handle BOTH 'baseapp' and 'baseaccount' sources
    useEffect(() => {
        console.log('🔍 Complete page loaded with source:', source);
        
        if (source === 'farcaster') {
            const stored = localStorage.getItem('farcasterProfile');
            if (stored) {
                try {
                    const profile = JSON.parse(stored);
                    console.log('📦 Loading Farcaster profile:', profile);
                    
                    setFormData(prev => ({
                        ...prev,
                        name: profile.displayName || profile.username || '',
                        interests: profile.bio || '',
                    }));
                    
                    const photoUrl = profile.photoUrl || profile.pfp_url || profile.pfp || '';
                    if (photoUrl) {
                        setAvatarUrl(photoUrl);
                        console.log('✅ Farcaster avatar loaded:', photoUrl);
                    }
                    
                    setProfileSource('farcaster');
                    localStorage.removeItem('farcasterProfile');
                } catch (error) {
                    console.error('❌ Error parsing Farcaster profile:', error);
                }
            }
        } 
        // CRITICAL FIX: Handle both 'baseaccount' AND 'baseapp' source names
        else if (source === 'baseaccount' || source === 'baseapp') {
            const stored = localStorage.getItem('baseAppProfile');
            if (stored) {
                try {
                    const profile = JSON.parse(stored);
                    console.log('📦 Loading Base Account profile:', profile);
                    
                    // Extract Base Account information
                    const baseInfo = {
                        basename: profile.basename || profile.name,
                        isSmartWallet: profile.isSmartWallet,
                        address: profile.address,
                    };
                    setBaseAccountInfo(baseInfo);
                    
                    setFormData(prev => ({
                        ...prev,
                        name: profile.displayName || profile.username || profile.basename || '',
                        interests: profile.bio || profile.description || '',
                    }));
                    
                    const photoUrl = profile.photoUrl || profile.pfp_url || profile.pfp || profile.avatar || '';
                    if (photoUrl) {
                        setAvatarUrl(photoUrl);
                        console.log('✅ Base Account avatar loaded:', photoUrl);
                    }
                    
                    setProfileSource('baseaccount');
                    // Keep in localStorage in case we need to reference it
                    // localStorage.removeItem('baseAppProfile');
                } catch (error) {
                    console.error('❌ Error parsing Base Account profile:', error);
                }
            } else {
                console.log('⚠️ No Base Account profile found in localStorage');
            }
        }
    }, [source]);

    // Generate fallback avatar if none exists
    useEffect(() => {
        if (address && !avatarUrl) {
            const seed = address.substring(2, 10);
            const generatedAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
            setAvatarUrl(generatedAvatarUrl);
            console.log('🎨 Generated fallback avatar for address:', address.substring(0, 10) + '...');
        }
    }, [address, avatarUrl]);

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
                    <p className="text-gray-700 dark:text-gray-300 mb-6 font-semibold">Connect Your Wallet</p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
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
                avatarUrl: avatarUrl?.substring(0, 50) + '...',
                profileSource: profileSource || 'manual',
                baseAccountInfo,
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
                    baseAccountInfo, // Include Base Account metadata
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-gray-200 dark:border-gray-700">
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
                
                {/* Source Badge with Base Account Info */}
                {profileSource && (
                    <div className="text-center mb-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                                profileSource === 'baseaccount' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            }`}>
                                {profileSource === 'farcaster' ? (
                                    <>✨ Imported from Farcaster</>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Base Account
                                    </>
                                )}
                            </span>
                            {baseAccountInfo?.basename && (
                                <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    {baseAccountInfo.basename}
                                </span>
                            )}
                            {baseAccountInfo?.isSmartWallet && (
                                <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    ⚡ Smart Wallet
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center">
                        {avatarUrl && (
                            <div className="text-center">
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full border-4 border-purple-200 dark:border-purple-800 mb-2 shadow-lg"
                                    onError={(e) => {
                                        console.error('❌ Avatar failed to load:', avatarUrl);
                                        if (address) {
                                            const seed = address.substring(2, 10);
                                            e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {profileSource ? 'Your profile photo' : 'Auto-generated avatar'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                        >
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interests *</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            required
                            rows={3}
                            className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                            placeholder="Hiking, Photography, Crypto..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                            placeholder="your@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg hover:shadow-xl"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/register/wallet/choice')}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
                    >
                        ← Back to signup options
                    </button>
                </div>
            </div>
        </div>
    );
}
