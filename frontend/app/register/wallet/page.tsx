'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

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

    // ✅ FIXED: Browser-safe UUID generation
    const generateUUID = () => {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    {/* ... existing UI ... */}
                    <ConnectButton />
                </div>
            </div>
        );
    }

    // ✅ FIXED: Proper typed data structure
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
                    { name: 'issuedAt', type: 'string' },  // ← Must be string
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
                issuedAt: timestamp.toString(),  // ← Convert to string here
            },
        };
    };

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

            // ✅ FIXED: Browser-safe nonce generation
            const nonce = generateUUID();
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

            // ✅ FIXED: Send message object properly
            console.log('📤 Sending registration request...');
            const response = await fetch('/api/profile/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    signature,
                    message: typedData.message,  // ← Send the full message object
                    name: formData.name,
                    age: ageNum,
                    gender: formData.gender,
                    interests: formData.interests,
                    email: formData.email,
                    photoUrl: formData.photoUrl,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

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
            {/* ... rest of your form UI ... */}
        </div>
    );
}
