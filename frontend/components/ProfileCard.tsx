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

    const { writeContract, data: hash, isPending: isWritePending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (profile.wallet_address) {
            const icon = blockies.create({
                seed: profile.wallet_address.toLowerCase(),
                size: 8,
                scale: 16,
            });
            setAvatarUrl(icon.toDataURL());
        }
    }, [profile.wallet_address]);

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

        const isCurrentlyPending = (isPendingProp ?? false) || isConfirming || isWritePending;
        if (isCurrentlyPending) return;

        try {
            if (onExpressInterest) {
                await onExpressInterest(profile.wallet_address);
            } else {
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

    useEffect(() => {
        if (isSuccess) {
            showNotification('Interest expressed successfully! Transaction confirmed.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }, [isSuccess]);

    useEffect(() => {
        if (error) {
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [error]);

    const isButtonDisabled = (isPendingProp ?? false) || isConfirming || isWritePending;

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 
            hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 hover:border-purple-300
            active:scale-[0.98] active:shadow-xl active:shadow-purple-500/30
            border border-gray-100">
            
            {/* Notification */}
            {notification && (
                <div className={`m-3 p-2.5 rounded-lg text-sm ${
                    notification.type === 'success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* Profile Image - Original style with slight zoom out */}
            <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden">
                {profile.photoUrl ? (
                    <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="w-full h-48 sm:h-56 md:h-64 object-cover scale-90"
                    />
                ) : avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={profile.name}
                        className="w-full h-48 sm:h-56 md:h-64 object-cover scale-90"
                    />
                ) : (
                    <div className="bg-gray-200 w-full h-48 sm:h-56 md:h-64 flex items-center justify-center">
                        <span className="text-5xl">👤</span>
                    </div>
                )}
            </div>

            {/* Profile Info - Reduced padding on mobile */}
            <div className="p-4 sm:p-5 md:p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{profile.name}</h3>
                    {onGift && (
                        <button
                            onClick={onGift}
                            className="text-pink-600 hover:text-pink-700 active:text-pink-800 
                                font-medium text-sm transition-colors duration-200
                                hover:scale-105 active:scale-95"
                        >
                            🎁 Gift
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center text-gray-600 mb-3 gap-1.5">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                        {profile.age} years
                    </span>
                    
                    {profile.email_verified && (
                        <span 
                            className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center"
                            title="Email Verified"
                        >
                            📧 Verified
                        </span>
                    )}
                    
                    {profile.wallet_verified && (
                        <span 
                            className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center"
                            title="Wallet Linked & Verified"
                        >
                            🔗 Wallet
                        </span>
                    )}
                    
                    {profile.gender && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {profile.gender}
                        </span>
                    )}
                </div>

                <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-2">{profile.interests}</p>

                <div className="flex space-x-3">
                    <button
                        onClick={handleExpressInterest}
                        disabled={isButtonDisabled}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                            py-2.5 sm:py-3 rounded-xl font-semibold 
                            transition-all duration-200
                            hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02]
                            active:scale-[0.98] active:shadow-md
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
