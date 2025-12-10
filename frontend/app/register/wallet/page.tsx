'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function WalletRegisterPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        interests: '',
        email: '',
        photoUrl: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Generate avatar based on wallet
    useEffect(() => {
        if (address) {
            const seed = address.substring(2, 10);
            setAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`);
        }
    }, [address]);

    // Redirect if not connected
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                        💖 BaseMatch
                    </h1>
                    <p className="text-gray-700 mb-6">Please connect your wallet to register</p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-gray-400 text-white py-3 rounded-xl font-semibold hover:opacity-90"
                    >
                        Back to home
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

            if (parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
                throw new Error('Age must be between 18 and 120');
            }

            // Sign message
            const message = `Register with wallet ${address}\n\nTimestamp: ${Date.now()}`;
            const signature = await signMessageAsync({ message });

            // Call register API
            const response = await fetch('/api/profile/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    name: formData.name,
                    age: parseInt(formData.age),
                    gender: formData.gender,
                    interests: formData.interests,
                    email: formData.email,
                    photoUrl: formData.photoUrl,
                    signature,
                    message,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Store registration data
            localStorage.setItem('walletRegistration', JSON.stringify({
                address,
                email: formData.email,
                createProfilePayload: data.createProfilePayload,
                needsEmailVerification: data.needsEmailVerification,
                contractAddress: data.contractAddress,
            }));

            // Redirect to minting page
            router.push('/mint');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
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
                <p className="text-gray-600 text-center mb-8">Complete Your Profile</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Avatar Display */}
                    <div className="flex justify-center">
                        {avatarUrl && (
                            <img
                                src={avatarUrl}
                                alt="Your avatar"
                                className="w-24 h-24 rounded-full border-4 border-purple-200"
                            />
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            A verification link will be sent to this email
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Create Profile & Mint NFT'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
