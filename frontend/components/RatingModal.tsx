// frontend/components/RatingModal.tsx
// FIXED: Wait for blockchain confirmation before checking 5-star achievement

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { REPUTATION_ABI, CONTRACTS } from '@/lib/contracts';
import { Star, X, Loader2 } from 'lucide-react';

interface RatingModalProps {
    matchAddress: string;
    matchName?: string;
    onClose: () => void;
    onSuccess?: () => void; // Optional callback when rating succeeds
}

export default function RatingModal({ matchAddress, matchName, onClose, onSuccess }: RatingModalProps) {
    const { address } = useAccount();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    // ✅ NEW: Track processing state
    const [isProcessingAchievements, setIsProcessingAchievements] = useState(false);

    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            showNotification('Please select a rating', 'error');
            return;
        }

        try {
            console.log(`⭐ Submitting ${rating}-star rating for ${matchAddress}`);
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

    // ✅ FIXED: Process rating confirmation sequentially
    useEffect(() => {
        if (isSuccess && address && !isProcessingAchievements) {
            showNotification('Rating submitted successfully!', 'success');
            setIsProcessingAchievements(true);
            processRatingCompletion();
        }
    }, [isSuccess, address, isProcessingAchievements]);

    // ✅ NEW: Sequential processing with proper timing
    const processRatingCompletion = async () => {
        try {
            console.log('✅ Rating transaction confirmed on blockchain');
            
            // STEP 1: Wait for blockchain state to propagate
            // The rateUser() transaction just confirmed, but we need to give
            // the blockchain a moment to make the new averageRating readable
            console.log('⏳ Waiting 8 seconds for blockchain state to propagate...');
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // STEP 2: Now check for achievements (blockchain state is ready)
            console.log('🏆 Now checking for 5-star achievement...');
            
            // Check achievements for the person being rated
            // (they might now have a 5.0 average rating)
            console.log(`🏆 Checking achievements for rated user: ${matchAddress}`);
            await checkAndMintAchievements(matchAddress);
            
            // Also check for the rater (in case they hit other milestones)
            console.log(`🏆 Checking achievements for rater: ${address}`);
            await checkAndMintAchievements(address);
            
            console.log('✅ Achievement check completed');
            
            // Call onSuccess callback if provided (for Dashboard refresh)
            if (onSuccess) {
                onSuccess();
            }
            
            // Close modal after a brief delay
            setTimeout(() => {
                onClose();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error processing rating completion:', error);
            // Still close the modal even if achievement check fails
            setTimeout(() => {
                onClose();
            }, 2000);
        } finally {
            setIsProcessingAchievements(false);
        }
    };

    // ✅ IMPROVED: Better error handling and logging
    const checkAndMintAchievements = async (userAddress: string) => {
        try {
            console.log(`🔍 Fetching achievements for ${userAddress}...`);
            
            const response = await fetch('/api/achievements/auto-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress }),
            });

            const data = await response.json();
            console.log(`📊 Achievement API response for ${userAddress}:`, data);
            
            if (data.stats) {
                console.log(`⭐ Average rating: ${data.stats.averageRating}`);
            }
            
            if (data.mintedAchievements && data.mintedAchievements.length > 0) {
                const successfulMints = data.mintedAchievements.filter(
                    (a: any) => a.status === 'success'
                );
                
                if (successfulMints.length > 0) {
                    console.log('🎉 New achievements minted!', successfulMints);
                    
                    // Show special notification if 5-star was earned
                    const fiveStarAchievement = successfulMints.find(
                        (a: any) => a.type === '5 Star Rating'
                    );
                    
                    if (fiveStarAchievement && userAddress.toLowerCase() === matchAddress.toLowerCase()) {
                        showNotification('🌟 Your date just earned a 5-Star Achievement!', 'success');
                    }
                } else {
                    console.log('ℹ️ No new achievements (already earned or not qualified yet)');
                }
            } else {
                console.log('ℹ️ No achievements minted');
            }
        } catch (error) {
            console.error('❌ Failed to check achievements:', error);
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
                        disabled={isPending || isConfirming || isProcessingAchievements}
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

                {/* ✅ NEW: Show processing state */}
                {isProcessingAchievements ? (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Checking Achievements...</h3>
                        <p className="text-sm text-gray-600">
                            Seeing if this rating unlocked any badges
                        </p>
                    </div>
                ) : (
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
                                {rating === 5 
                                    ? 'A 5-star rating might unlock a special achievement badge!'
                                    : 'Your rating will be stored on the blockchain and may unlock achievements!'
                                }
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
                )}
            </div>
        </div>
    );
}
