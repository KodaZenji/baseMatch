'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

export default function CompleteEmailProfilePage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();

    const [email, setEmail] = useState('');
    const [profile_id, setProfile_id] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        birthYear: '',
        gender: '',
        interests: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Get email and profile_id from localStorage (set after email verification)
        const emailVerified = localStorage.getItem('emailVerified');
        if (emailVerified) {
            const data = JSON.parse(emailVerified);
            setEmail(data.email);
            setProfile_id(data.profile_id);
        }
    }, []);

    // Show wallet connection screen if not connected but email is verified
    if (!isConnected && email) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
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
                    <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        BaseMatch
                    </h1>
                    <p className="text-gray-700 mb-2 font-semibold">Step 2: Connect Wallet</p>
                    <p className="text-gray-600 mb-6">
                        Email verified! Now connect your wallet to complete your profile.
                    </p>
                    <div className="bg-green-50 rounded-lg p-3 mb-6 border border-green-200">
                        <p className="text-sm text-green-800">✅ {email}</p>
                    </div>
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    // Redirect if no email (user hasn't verified email yet)
    if (!email) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
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
                    <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        BaseMatch
                    </h1>
                    <p className="text-gray-700 mb-6">
                        Please verify your email first
                    </p>
                    <button
                        onClick={() => router.push('/register/email')}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
                    >
                        Back to Email Registration
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
            if (!profile_id) throw new Error('Profile ID not found. Please verify your email again.');

            // Validate form
            if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests) {
                throw new Error('Please fill in all required fields');
            }

            const currentYear = new Date().getFullYear();
            const birthYear = parseInt(formData.birthYear);
            const calculatedAge = currentYear - birthYear;
            if (isNaN(birthYear) || calculatedAge < 18 || calculatedAge > 120) {
                throw new Error('Birth year must correspond to an age between 18 and 120');
            }

            // Store for minting using registerWithEmail with profile_id
            localStorage.setItem('emailFirstMint', JSON.stringify({
                profile_id: profile_id,
                id: profile_id,
                email,
                address,
                useRegisterWithEmail: true,
                registerWithEmailPayload: {
                    name: formData.name,
                    birthYear: parseInt(formData.birthYear),
                    gender: formData.gender,
                    interests: formData.interests,
                    email: email,
                },
                contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
            }));

            // Redirect to minting page
            router.push('/mint');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
                <div className="flex justify-center mb-6">
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

                <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    BaseMatch
                </h1>
                <p className="text-gray-600 text-center mb-2">Complete Your Profile</p>
                <p className="text-sm text-gray-500 text-center mb-8">Email: {email}</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

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

                    {/* Birth Year - FIXED */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select birth year</option>
                            {(() => {
                                const currentYear = new Date().getFullYear();
                                const options = [];
                                // Generate years for ages 18 to 100
                                for (let age = 18; age <= 100; age++) {
                                    const year = currentYear - age;
                                    options.push(
                                        <option key={year} value={year}>
                                            {year} ({age} years old)
                                        </option>
                                    );
                                }
                                return options;
                            })()}
                        </select>
                        {formData.birthYear && (
                            <p className="text-xs text-gray-500 mt-1">
                                Age: {new Date().getFullYear() - parseInt(formData.birthYear)} years old
                            </p>
                        )}
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            localStorage.removeItem('emailVerified');
                            router.push('/');
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
