'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';

export default function ConnectWalletPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected } = useAccount();
    const email = searchParams.get('email');

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        interests: '',
        email: email || '',
    });
    const [avatarUrl, setAvatarUrl] = useState('');
    const [formError, setFormError] = useState('');
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Generate avatar when wallet connects
    useEffect(() => {
        if (address) {
            const avatar = generateAvatar(address);
            setAvatarUrl(avatar);
            setIsLoadingProfile(false);
        }
    }, [address]);

    // Load user profile from localStorage
    useEffect(() => {
        const pendingVerification = localStorage.getItem('pendingEmailVerification');
        if (pendingVerification) {
            const data = JSON.parse(pendingVerification);
            setFormData({
                name: data.name,
                age: data.age,
                gender: data.gender,
                interests: data.interests,
                email: data.email,
            });
        }
    }, []);

    // Handle redirect after successful profile creation
    useEffect(() => {
        if (isSuccess && address) {
            // Register profile in Supabase and Neynar
            const registerProfile = async () => {
                try {
                    const response = await fetch('/api/create-profile', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            address,
                            name: formData.name,
                            age: parseInt(formData.age),
                            gender: formData.gender,
                            interests: formData.interests,
                            email: formData.email,
                            photoUrl: avatarUrl,
                        }),
                    });

                    if (response.ok) {
                        // Clear localStorage
                        localStorage.removeItem('pendingEmailVerification');
                        localStorage.removeItem('emailVerified');

                        // Redirect to home
                        setTimeout(() => {
                            router.push('/');
                        }, 1500);
                    } else {
                        setFormError('Failed to save profile. Please try again.');
                    }
                } catch (error) {
                    console.error('Error registering profile:', error);
                    setFormError('Failed to save profile. Please try again.');
                }
            };

            registerProfile();
        }
    }, [isSuccess, address, formData, avatarUrl, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            setFormError('Please connect your wallet first');
            return;
        }

        const age = parseInt(formData.age);
        if (isNaN(age) || age < 18 || age > 100) {
            setFormError('Please enter a valid age between 18 and 100');
            return;
        }

        // Create on-chain profile
        writeContract({
            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
            abi: PROFILE_NFT_ABI,
            functionName: 'createProfile',
            args: [formData.name, age, formData.gender, formData.interests, avatarUrl],
        });
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                        💖 BaseMatch
                    </h1>
                    <p className="text-gray-700 text-lg mb-6">
                        Your email has been verified! Now let's connect your wallet to complete your profile.
                    </p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingProfile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
                <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Complete Your Profile
                </h2>

                {formError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex justify-center">
                        {avatarUrl && (
                            <img
                                src={avatarUrl}
                                alt="Your avatar"
                                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                            />
                        )}
                    </div>

                    {/* Profile Info (Read-only) */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-2"><strong>Name:</strong> {formData.name}</p>
                        <p className="text-sm text-gray-600 mb-2"><strong>Age:</strong> {formData.age}</p>
                        <p className="text-sm text-gray-600 mb-2"><strong>Gender:</strong> {formData.gender}</p>
                        <p className="text-sm text-gray-600 mb-2"><strong>Interests:</strong> {formData.interests}</p>
                        <p className="text-sm text-gray-600"><strong>Email:</strong> {formData.email}</p>
                    </div>

                    {/* Wallet Info */}
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Connected Wallet:</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{address}</p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending || isConfirming}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPending ? 'Creating Profile...' : isConfirming ? 'Confirming...' : 'Create Profile NFT'}
                    </button>
                </form>
            </div>
        </div>
    );
}
