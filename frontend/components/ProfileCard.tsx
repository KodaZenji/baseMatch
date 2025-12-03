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

    // Note: We rely on isPendingProp from the parent (BrowseProfiles) or isWritePending/isConfirming
    const { writeContract, data: hash, isPending: isWritePending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Generate avatar based on wallet address
    useEffect(() => {
        // Use wallet_address for the blockie if it exists
        if (profile.wallet_address) {
            const icon = blockies.create({
                seed: profile.wallet_address.toLowerCase(),
                size: 8,
                scale: 16,
            });
            setAvatarUrl(icon.toDataURL());
        }
    }, [profile.wallet_address]); // Dependency corrected to wallet_address

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

        // Use the combined pending state to disable the button
        const isCurrentlyPending = (isPendingProp ?? false) || isConfirming || isWritePending;
        if (isCurrentlyPending) return;

        try {
            if (onExpressInterest) {
                // Call the custom handler passed from the parent (BrowseProfiles)
                await onExpressInterest(profile.wallet_address);
            } else {
                // Direct smart contract interaction (Fallback if no custom handler is passed)
                writeContract({
                    address: CONTRACTS.MATCHING as `0x${string}`,
                    abi: MATCHING_ABI,
                    functionName: 'expressInterest',
                    args: [profile.wallet_address as `0x${string}`],
                });
            }
        } catch (error) {
            console.error('Error expressing interest:', error);
            showNotification('Failed to express interest', 'error');
        }
    };

    // Handle successful transaction
    useEffect(() => {
        if (isSuccess) {
            showNotification('Interest expressed successfully! Transaction confirmed.', 'success');
            // Reload the page to update the UI
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }, [isSuccess]);

    // Handle transaction error
    useEffect(() => {
        if (error) {
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [error]);

    const isButtonDisabled = (isPendingProp ?? false) || isConfirming || isWritePending;

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
                {/* Age tag moved inside the info block for better mobile responsiveness */}
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

                <div className="flex flex-wrap items-center text-gray-600 mb-3 space-x-2">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full mb-1">
                        {profile.age} years
                    </span>
                    
                    {/* 1. EMAIL VERIFIED BADGE */}
                    {profile.email_verified && (
                        <span 
                            className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center mb-1"
                            title="Email Verified"
                        >
                            📧 Email Verified
                        </span>
                    )}
                    
                    {/* 2. WALLET VERIFIED BADGE */}
                    {profile.wallet_verified && (
                        <span 
                            className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center mb-1"
                            title="Wallet Linked & Verified"
                        >
                            🔗 Wallet Linked
                        </span>
                    )}
                    
                    {profile.gender && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mb-1">
                            {profile.gender}
                        </span>
                    )}
                </div>

                <p className="text-gray-600 mb-4">{profile.interests}</p>

                <div className="flex space-x-3">
                    <button
                        onClick={handleExpressInterest}
                        disabled={isButtonDisabled}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isButtonDisabled ? (
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
