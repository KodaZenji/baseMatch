// app/register/wallet/complete/page.tsx - REPLACE EXISTING

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

    // Load profile if coming from Farcaster or Base App
    useEffect(() => {
        if (source === 'farcaster') {
            const stored = localStorage.getItem('farcasterProfile');
            if (stored) {
                const profile = JSON.parse(stored);
                setFormData(prev => ({
                    ...prev,
                    name: profile.displayName || '',
                    interests: profile.bio || '',
                }));
                setAvatarUrl(profile.pfp || '');
                setProfileSource('farcaster');
                localStorage.removeItem('farcasterProfile');
            }
        } else if (source === 'baseapp') {
            const stored = localStorage.getItem('baseAppProfile');
            if (stored) {
                const profile = JSON.parse(stored);
                setFormData(prev => ({
                    ...prev,
                    name: profile.displayName || '',
                    interests: profile.bio || '',
                }));
                setAvatarUrl(profile.pfp || '');
                setProfileSource('baseapp');
                localStorage.removeItem('baseAppProfile');
            }
        }
    }, [source]);

    // Generate avatar based on wallet address if no profile photo
    useEffect(() => {
        if (address && !avatarUrl) {
            const seed = address.substring(2, 10);
            const generatedAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
            setAvatarUrl(generatedAvatarUrl);
        }
    }, [address, avatarUrl]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="bg-white rounded-full p-3 shadow-lg">
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
                    <p className="text-gray-700 mb-6 font-semibold">Connect Your Wallet</p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 text-sm"
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            localStorage.setItem('walletRegistration', JSON.stringify({
                profile_id: data.userInfo?.profileId,
                id: data.userInfo?.profileId,
                address: address,
                email: formData.email,
                createProfilePayload: {
                    name: formData.name,
                    birthYear: birthYear,
                    gender: formData.gender,
                    interests: formData.interests,
                    photoUrl: avatarUrl,
                },
                contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
            }));

            router.push('/mint');
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="bg-white rounded-full p-3 shadow-lg">
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
                
                {profileSource && (
                    <div className="text-center mb-4">
                        <span className="inline-block bg-purple-100 text-purple-700 text-sm px-3 py-1 rounded-full">
                            {profileSource === 'farcaster' ? ' Imported from Farcaster' : ' Imported from Base App'}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center">
                        {avatarUrl && (
                            <div className="text-center">
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full border-4 border-purple-200 mb-2"
                                />
                                <p className="text-xs text-gray-500">
                                    {profileSource ? 'Your profile photo' : 'Auto-generated avatar'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-600"
                        >
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interests *</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            required
                            rows={3}
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
                            placeholder="Hiking, Photography, Crypto..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
                            placeholder="your@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
