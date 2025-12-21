'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { REPUTATION_ABI, CONTRACTS } from '@/lib/contracts';
import { Star, X, Loader2 } from 'lucide-react';

interface RatingModalProps {
    matchAddress: string;
    matchName?: string;
    onClose: () => void;
}

export default function RatingModal({ matchAddress, matchName, onClose }: RatingModalProps) {
    const { address } = useAccount();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            showNotification('Please select a rating', 'error');
            return;
        }

        try {
            writeContract({
                address: CONTRACTS.REPUTATION as `0x${string}`,
                abi: REPUTATION_ABI,
                functionName: 'rateUser',
                args: [matchAddress as `0x${string}`, rating],
            });
        } catch (error) {
            console.error('Error rating user:', error);
            showNotification('Failed to submit rating', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    // After successful rating
    useEffect(() => {
        if (isSuccess && address) {
            showNotification('Rating submitted successfully!', 'success');
            
            // FIXED: Record date for BOTH the rater and the person being rated
            // This ensures both users get credit for the date
            recordDateForBothUsers(address, matchAddress);
            
            // Check for achievements for both users
            checkAndMintAchievements(matchAddress);
            checkAndMintAchievements(address);
            
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [isSuccess, onClose, matchAddress, address]);

    // FIXED: Record date for both users
    const recordDateForBothUsers = async (raterAddress: string, ratedUserAddress: string) => {
        try {
            console.log('📝 Recording date for both rater and rated user');
            
            // Record for the person being rated
            await fetch('/api/date/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: ratedUserAddress }),
            });
            
            // Record for the person doing the rating
            await fetch('/api/date/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: raterAddress }),
            });
            
            console.log('✅ Date recorded for both users');
        } catch (error) {
            console.error('Failed to record dates:', error);
        }
    };

    // Trigger auto-mint check
    const checkAndMintAchievements = async (userAddress: string) => {
        try {
            const response = await fetch('/api/achievements/auto-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress }),
            });

            const data = await response.json();
            
            if (data.mintedAchievements && data.mintedAchievements.length > 0) {
                console.log('🏆 New achievements minted!', data.mintedAchievements);
            }
        } catch (error) {
            console.error('Failed to check achievements:', error);
        }
    };

    useEffect(() => {
        if (isError && error) {
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [isError, error]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Rate Your Date</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isPending || isConfirming}
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-gray-600 mb-6">
                    {matchName ? `How was your experience with ${matchName}?` : 'Help build a trustworthy community by rating your experience'}
                </p>

                {notification && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                        notification.type === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                    }`}>
                        {notification.type === 'success' ? '✓' : '✕'}
                        <span>{notification.message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center">
                        <div className="flex justify-center space-x-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="text-5xl transition-transform hover:scale-110 focus:outline-none"
                                    disabled={isPending || isConfirming}
                                >
                                    {(hoveredRating || rating) >= star ? (
                                        <Star className="fill-yellow-400 text-yellow-400" size={48} />
                                    ) : (
                                        <Star className="text-gray-300" size={48} />
                                    )}
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-gray-600 font-medium">
                                {rating === 5 && 'Amazing! 🎉'}
                                {rating === 4 && 'Great! 👍'}
                                {rating === 3 && 'Good 👌'}
                                {rating === 2 && 'Okay 😐'}
                                {rating === 1 && 'Could be better 😕'}
                            </p>
                        )}
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                        <p className="font-semibold mb-1 flex items-center gap-2">
                            <span>💡</span> Tip:
                        </p>
                        <p className="text-xs">
                            Your rating will be stored on the blockchain and may unlock achievements!
                        </p>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            disabled={isPending || isConfirming}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || isConfirming || rating === 0}
                            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isPending || isConfirming ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin" size={16} />
                                    {isPending ? 'Confirm in wallet...' : 'Submitting...'}
                                </span>
                            ) : (
                                'Submit Rating'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
