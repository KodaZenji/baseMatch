'use client';

import { useState, useEffect } from 'react';
import blockies from 'blockies-ts';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MATCHING_ABI, CONTRACTS } from '@/lib/contracts';

export default function ProfileCard({
    profile,
    onGift,
    onExpressInterest,
    isPending: isPendingProp
}: {
    profile: any;
    onGift?: () => void;
    onExpressInterest?: (address: string) => Promise<void>;
    isPending?: boolean;
}) {
    const { address } = useAccount();
    const [avatarUrl, setAvatarUrl] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isExpressingInterest, setIsExpressingInterest] = useState(false);

    const { writeContract, data: hash, isPending: isWritePending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Generate avatar based on wallet address
    useEffect(() => {
        if (profile.address) {
            const icon = blockies.create({
                seed: profile.address.toLowerCase(),
                size: 8,
                scale: 16,
            });
            setAvatarUrl(icon.toDataURL());
        }
    }, [profile.address]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const handleExpressInterest = async () => {
        if (!address) {
            showNotification('Please connect your wallet first', 'error');
            return;
        }

        setIsExpressingInterest(true);

        try {
            if (onExpressInterest) {
                await onExpressInterest(profile.address);
                showNotification('Interest expressed successfully!', 'success');
            } else {
                writeContract({
                    address: CONTRACTS.MATCHING as `0x${string}`,
                    abi: MATCHING_ABI,
                    functionName: 'expressInterest',
                    args: [profile.address as `0x${string}`],
                });
            }
        } catch (error) {
            console.error('Error expressing interest:', error);
            showNotification('Failed to express interest', 'error');
            setIsExpressingInterest(false);
        }
    };

    // Handle successful transaction
    if (isSuccess) {
        showNotification('Interest expressed successfully!', 'success');
        setIsExpressingInterest(false);
        // Reload the page to update the UI
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    // Handle transaction error
    if (error) {
        showNotification(`Transaction error: ${error.message}`, 'error');
        setIsExpressingInterest(false);
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            {/* Notification */}
            {notification && (
                <div className={`m-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {notification.message}
                </div>
            )}

            {/* Profile Image */}
            <div className="relative">
                {profile.photoUrl ? (
                    <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="w-full h-64 object-cover"
                    />
                ) : avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={profile.name}
                        className="w-full h-64 object-cover"
                    />
                ) : (
                    <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
                        <span className="text-6xl">👤</span>
                    </div>
                )}
                <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 text-sm font-medium shadow-md">
                    {profile.age} years
                </div>
            </div>

            {/* Profile Info */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                    {onGift && (
                        <button
                            onClick={onGift}
                            className="text-pink-600 hover:text-pink-800 font-medium text-sm"
                        >
                            🎁 Gift
                        </button>
                    )}
                </div>

                <div className="flex items-center text-gray-600 mb-2">
                    <span className="mr-2">{profile.age} years</span>
                    {profile.gender && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {profile.gender}
                        </span>
                    )}
                </div>

                <p className="text-gray-600 mb-4">{profile.interests}</p>

                <div className="flex space-x-3">
                    <button
                        onClick={handleExpressInterest}
                        disabled={(isPendingProp ?? false) || isConfirming || isExpressingInterest}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {(isPendingProp ?? false) || isConfirming || isExpressingInterest ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Expressing...
                            </span>
                        ) : (
                            'Express Interest'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}