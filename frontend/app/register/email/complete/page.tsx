'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function CompleteEmailProfilePage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();

    const [email, setEmail] = useState('');
    const [profile_id, setProfile_id] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        interests: '',
        photoUrl: '',
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
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                        💖 BaseMatch
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
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                        💖 BaseMatch
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
            if (!formData.name || !formData.age || !formData.gender || !formData.interests) {
                throw new Error('Please fill in all required fields');
            }

            if (parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
                throw new Error('Age must be between 18 and 120');
            }

            // Store for minting using registerWithEmail with profile_id
            localStorage.setItem('emailFirstMint', JSON.stringify({
                profile_id: profile_id, // Store as profile_id (snake_case)
                id: profile_id, // Also store as id for compatibility
                email,
                address,
                useRegisterWithEmail: true,
                registerWithEmailPayload: {
                    name: formData.name,
                    age: parseInt(formData.age),
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
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2 text-center">
                    💖 BaseMatch
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">Photos can be added later when editing your profile</p>
                    </div>
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
                        {isLoading ? 'Processing...' : 'Mint Profile NFT'}
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
                        Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
