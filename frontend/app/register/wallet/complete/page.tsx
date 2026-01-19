'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

export default function CompleteWalletProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected } = useAccount();
    const source = searchParams.get('source');

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
    const [isCheckingExisting, setIsCheckingExisting] = useState(true);

    
    useEffect(() => {
        if (!address) {
            setIsCheckingExisting(false);
            return;
        }

        const checkExistingProfile = async () => {
            try {
                const response = await fetch('/api/profile/get', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address }),
                });

                if (response.ok) {
                    const { profile } = await response.json();
                    
                    if (profile) {
                        console.log('✅ Found existing profile:', profile);
                        
                        
                        if (profile.photoUrl) {
                            setAvatarUrl(profile.photoUrl);
                            setProfileSource(profile.profile_source || 'existing');
                            console.log('📸 Using existing photo:', profile.photoUrl);
                        }
                        
                        // Pre-fill form with existing data
                        setFormData({
                            name: profile.name || '',
                            birthYear: profile.birthYear?.toString() || '',
                            gender: profile.gender || '',
                            interests: profile.interests || '',
                            email: profile.email || '',
                        });
                    }
                }
            } catch (err) {
                console.error('Error checking existing profile:', err);
            } finally {
                setIsCheckingExisting(false);
            }
        };

        checkExistingProfile();
    }, [address]);

    // Load profile from Farcaster or Base App
    useEffect(() => {
        
        if (isCheckingExisting || avatarUrl) return;

        if (source === 'farcaster') {
            const stored = localStorage.getItem('farcasterProfile');
            if (stored) {
                try {
                    const profile = JSON.parse(stored);
                    console.log('📸 Farcaster profile loaded:', profile);
                    
                    setFormData(prev => ({
                        ...prev,
                        name: profile.displayName || profile.display_name || '',
                        interests: profile.bio || '',
                    }));
                    
                    
                    const photoUrl = profile.photoUrl || profile.pfp_url || profile.pfp || '';
                    if (photoUrl) {
                        setAvatarUrl(photoUrl);
                        setProfileSource('farcaster');
                        console.log('✅ Farcaster avatar URL set:', photoUrl);
                    }
                } catch (e) {
                    console.error('❌ Failed to parse Farcaster profile:', e);
                }
            }
        } else if (source === 'baseapp') {
            const stored = localStorage.getItem('baseAppProfile');
            if (stored) {
                try {
                    const profile = JSON.parse(stored);
                    console.log('📸 Base App profile loaded:', profile);
                    
                    setFormData(prev => ({
                        ...prev,
                        name: profile.displayName || profile.name || '',
                        interests: profile.bio || profile.description || '',
                    }));
                    
                    
                    const photoUrl = profile.photoUrl || profile.pfp || profile.avatar || '';
                    if (photoUrl) {
                        setAvatarUrl(photoUrl);
                        setProfileSource('baseapp');
                        console.log('✅ Base App avatar URL set:', photoUrl);
                    }
                } catch (e) {
                    console.error('❌ Failed to parse Base App profile:', e);
                }
            }
        }
    }, [source, isCheckingExisting, avatarUrl]);

    
    useEffect(() => {
        if (isCheckingExisting || avatarUrl || !address) return;

        console.log('🎲 No existing photo found, generating Dicebear avatar');
        const seed = address.substring(2, 10);
        const generatedAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
        setAvatarUrl(generatedAvatarUrl);
        setProfileSource(prev => prev || 'manual');
    }, [address, avatarUrl, isCheckingExisting]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
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
                    <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        BaseMatch
                    </h1>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 font-semibold">Connect Your Wallet</p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm"
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

            console.log('📤 Submitting profile:', {
                source: profileSource,
                hasPhoto: !!avatarUrl,
                photoUrl: avatarUrl
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
                    profileSource: profileSource, // 🔥 FIX: Send profileSource
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            console.log('✅ Profile registered successfully');

            // Store for minting
            localStorage.setItem('walletFirstMint', JSON.stringify({
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
            }));

            // Clean up
            localStorage.removeItem('farcasterProfile');
            localStorage.removeItem('baseAppProfile');

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
                {/* Rest of JSX remains the same... */}
                <div className="flex justify-center mb-6">
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

                <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    Complete Your Profile
                </h1>
                
                {profileSource && profileSource !== 'manual' && (
                    <div className="text-center mb-4">
                        <span className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm px-3 py-1 rounded-full border border-purple-200 dark:border-purple-700">
                            {profileSource === 'farcaster' ? '🟣 Imported from Farcaster' : 
                             profileSource === 'baseapp' ? '🟦 Imported from Base App' :
                             profileSource === 'existing' ? '✅ Existing Profile Found' :
                             'Manual Entry'}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Avatar Display */}
                    <div className="flex justify-center">
                        {avatarUrl && (
                            <div className="text-center">
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full border-4 border-purple-200 dark:border-purple-700 mb-2 object-cover"
                                    onError={(e) => {
                                        console.error('❌ Image failed to load:', avatarUrl);
                                        if (address) {
                                            const seed = address.substring(2, 10);
                                            e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {profileSource === 'farcaster' ? 'From Farcaster' :
                                     profileSource === 'baseapp' ? 'From Base App' :
                                     profileSource === 'existing' ? 'Existing Photo' :
                                     'Auto-generated avatar'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Form fields... */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="your@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
