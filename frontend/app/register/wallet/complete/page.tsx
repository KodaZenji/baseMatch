'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

export default function CompleteWalletProfilePage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        interests: '',
        email: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            const seed = address.substring(2, 10);
            const generatedAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
            setAvatarUrl(generatedAvatarUrl);
        }
    }, [address]);

    // Show wallet connection screen if not connected
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
                    <p className="text-gray-600 mb-6">
                        Connect your wallet to create your profile
                    </p>
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

            // Validate form
            if (!formData.name || !formData.age || !formData.gender || !formData.interests || !formData.email) {
                throw new Error('Please fill in all required fields');
            }

            const ageNum = parseInt(formData.age);
            if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
                throw new Error('Age must be between 18 and 120');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Register the profile WITH the generated avatar URL
            console.log('📤 Registering profile...');
            const response = await fetch('/api/profile/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    name: formData.name,
                    age: ageNum,
                    gender: formData.gender,
                    interests: formData.interests,
                    email: formData.email,
                    photoUrl: avatarUrl,
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            console.log('✅ Profile registered:', data);

            // Store for minting - MATCH THE EMAIL FLOW STRUCTURE
            localStorage.setItem('walletFirstMint', JSON.stringify({
                profile_id: data.userInfo?.profileId, // Use snake_case like email flow
                id: data.userInfo?.profileId, // Also store as id for compatibility
                address: address,
                email: formData.email,
                useRegisterWithWallet: true, // This flag tells mint page to use wallet flow
                registerWithWalletPayload: {
                    name: formData.name,
                    age: ageNum,
                    gender: formData.gender,
                    interests: formData.interests,
                    email: formData.email,
                    photoUrl: avatarUrl, // Include photoUrl in payload
                },
                contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
            }));

            // Redirect to mint page
            router.push('/register/wallet/mint');
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
                {/* Logo/Heart Icon */}
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
                    BaseMatch
                </h1>
                <p className="text-gray-600 text-center mb-2">Complete Your Profile</p>
                {address && (
                    <p className="text-sm text-gray-500 text-center font-mono mb-8">
                        Wallet: {address.substring(0, 6)}...{address.substring(38)}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Avatar Display */}
                    <div className="flex justify-center">
                        {avatarUrl && (
                            <div className="text-center">
                                <img
                                    src={avatarUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full border-4 border-purple-200 mb-2"
                                />
                                <p className="text-xs text-gray-500">Your auto-generated profile avatar</p>
                            </div>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                        />
                    </div>

                    {/* Age */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            min="18"
                            max="120"
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                        >
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Interests */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interests *</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            required
                            rows={3}
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hiking, Photography, Crypto..."
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            We'll send a verification code to confirm your email
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold 
                          hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={handleBack}
                        className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
