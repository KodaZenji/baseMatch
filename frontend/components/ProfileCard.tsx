'use client';

import { useState, useEffect } from 'react';
import blockies from 'blockies-ts';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MATCHING_ABI, CONTRACTS } from '@/lib/contracts';
import { Gift, Search, User, Mail, Link2, X, Loader } from 'lucide-react';

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
    const [showImagePreview, setShowImagePreview] = useState(false);

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
                <div className={`m-3 p-2.5 rounded-lg text-sm ${notification.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {notification.message}
                </div>
            )}

            {/* Profile Image - Click to preview */}
            <div
                className="relative w-full aspect-[4/3] bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden cursor-pointer group"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowImagePreview(true);
                }}
            >
                {profile.photoUrl ? (
                    <>
                        <img
                            src={profile.photoUrl}
                            alt={profile.name}
                            className="w-full h-full object-cover scale-90 transition-transform group-hover:scale-95"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                            <span className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        </div>
                    </>
                ) : avatarUrl ? (
                    <>
                        <img
                            src={avatarUrl}
                            alt={profile.name}
                            className="w-full h-full object-cover scale-90 transition-transform group-hover:scale-95"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <User className="text-gray-400" size={80} />
                    </div>
                )}
            </div>

            {/* Profile Info */}
            <div className="p-4 sm:p-5 md:p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{profile.name}</h3>
                    {onGift && (
                        <button
                            onClick={onGift}
                            className="flex items-center gap-1.5 text-pink-600 hover:text-pink-700 active:text-pink-800 
                                font-medium text-sm transition-colors duration-200
                                hover:scale-105 active:scale-95"
                        >
                            <Gift size={16} />
                            Gift
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center text-gray-600 mb-3 gap-1.5">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                        {profile.birthYear ? new Date().getFullYear() - profile.birthYear : profile.age} years
                    </span>

                    {profile.email_verified && (
                        <span
                            className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                            title="Email Verified"
                        >
                            <Mail size={12} />
                            Verified
                        </span>
                    )}

                    {profile.wallet_verified && (
                        <span
                            className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                            title="Wallet Linked & Verified"
                        >
                            <Link2 size={12} />
                            Wallet
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
                            <span className="flex items-center justify-center gap-2">
                                <Loader className="animate-spin" size={18} />
                                Expressing...
                            </span>
                        ) : (
                            'Express Interest'
                        )}
                    </button>
                </div>
            </div>

            {/* Image Preview Modal - Card format, mobile-friendly close */}
            {showImagePreview && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
                    onMouseDown={(e) => {
                        // Only close if clicking the backdrop, not the card
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowImagePreview(false);
                        }
                    }}
                    onTouchStart={(e) => {
                        // Mobile: close on backdrop touch
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowImagePreview(false);
                        }
                    }}
                >
                    <div
                        className="relative bg-black rounded-3xl overflow-hidden max-w-md w-full shadow-2xl"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowImagePreview(false);
                            }}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowImagePreview(false);
                            }}
                            className="absolute top-3 right-3 text-white bg-black bg-opacity-60 rounded-full w-10 h-10 flex items-center justify-center z-10 shadow-lg hover:bg-opacity-80 transition-all"
                        >
                            <X size={20} />
                        </button>

                        {/* Image directly - no extra container */}
                        <img
                            src={profile.photoUrl || avatarUrl}
                            alt={profile.name}
                            className="w-full h-auto object-contain pointer-events-none"
                        />

                        {/* Name below image */}
                        <div className="bg-black py-4 text-center border-t border-gray-800">
                            <p className="text-white text-lg font-medium">{profile.name}</p>
                            <p className="text-gray-400 text-xs mt-1">Tap anywhere to close</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
