'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';
import { randomUUID } from 'crypto';

export default function WalletRegisterPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { signTypedDataAsync } = useSignTypedData();

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

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            const seed = address.substring(2, 10);
            const generatedAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
            setAvatarUrl(generatedAvatarUrl);
            setFormData(prev => ({ ...prev, photoUrl: generatedAvatarUrl }));
        }
    }, [address]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="bg-white rounded-full p-3 shadow-lg">
                                <Heart
                                    className="w-12 h-12"
                                    fill="url(#brandGradient)"
                                    stroke="none"
                                />
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

    // ------------------------
    // Typed Data Builder
    // ------------------------
    const buildRegistrationTypedData = (address: string, nonce: string, timestamp: number) => {
        const verifyingContract = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;
        if (!verifyingContract || !verifyingContract.startsWith('0x')) {
            throw new Error('Invalid PROFILE_NFT_ADDRESS: must be 0x-prefixed');
        }

        return {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                ],
                Registration: [
                    { name: 'address', type: 'address' },
                    { name: 'nonce', type: 'string' },
                    { name: 'issuedAt', type: 'string' },
                ],
            },
            primaryType: 'Registration' as const,
            domain: {
                name: 'BaseMatch',
                version: '1',
                chainId: 8453,
                verifyingContract: verifyingContract as `0x${string}`,
            },
            message: {
                address,
                nonce,
                issuedAt: timestamp.toString(),
            },
        };
    };

    // ------------------------
    // Form Submit
    // ------------------------
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
            if (!emailRegex.test(formData.email)) throw new Error('Please enter a valid email address');

            // ------------------------
            // Typed data signing
            // ------------------------
            const nonce = randomUUID();
            const timestamp = Date.now();
            const typedData = buildRegistrationTypedData(address, nonce, timestamp);

            console.log('📝 TypedData to sign:', JSON.stringify(typedData, null, 2));

            const signature = await signTypedDataAsync({
                domain: typedData.domain,
                types: typedData.types,
                primaryType: typedData.primaryType,
                message: typedData.message,
            });
            console.log('✅ Typed data signed:', signature);

            // ------------------------
            // Call register API
            // ------------------------
            console.log('📤 Sending registration request...');
            const response = await fetch('/api/profile/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    signature,
                    nonce,
                    issuedAt: timestamp,
                    name: formData.name,
                    age: ageNum,
                    gender: formData.gender,
                    interests: formData.interests,
                    email: formData.email,
                    photoUrl: formData.photoUrl,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');

            console.log('✅ Registration successful');

            localStorage.setItem('walletRegistration', JSON.stringify({
                address,
                email: formData.email,
                createProfilePayload: data.createProfilePayload,
                needsEmailVerification: data.needsEmailVerification,
                contractAddress: data.contractAddress,
            }));

            router.push('/mint');
        } catch (err) {
            console.error('❌ Registration error:', err);
            setError(err instanceof Error ? err.message : 'Registration failed');
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
                            <Heart
                                className="w-12 h-12"
                                fill="url(#brandGradient2)"
                                stroke="none"
                            />
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
                <p className="text-gray-600 text-center mb-8">Complete Your Profile</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Avatar */}
                    <div className="flex justify-center">
                        {avatarUrl && (
                            <div className="text-center">
                                <img
                                    src={avatarUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full border-4 border-purple-200 mb-2"
                                />
                                <p className="text-xs text-gray-500">Your profile avatar</p>
                            </div>
                        )}
                    </div>

                    {/* Name, Age, Gender, Interests, Email */}
                    {/* ... same input fields as before ... */}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
