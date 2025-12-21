'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { REPUTATION_ABI, CONTRACTS } from '@/lib/contracts';
import { Star, X, Loader2 } from 'lucide-react';

interface RatingModalProps {
    matchAddress: string;
    matchName?: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function RatingModal({ matchAddress, matchName, onClose, onSuccess }: RatingModalProps) {
    const { address } = useAccount();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
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
            writeContract({
                address: CONTRACTS.REPUTATION as `0x${string}`,
                abi: REPUTATION_ABI,
                functionName: 'rateUser',
                args: [matchAddress as `0x${string}`, rating],
            });
        } catch (error) {
            showNotification('Failed to submit rating', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        if (isSuccess && address && !isProcessingAchievements) {
            showNotification('Rating submitted successfully!', 'success');
            setIsProcessingAchievements(true);
            processRatingCompletion();
        }
    }, [isSuccess, address, isProcessingAchievements]);

    const processRatingCompletion = async () => {
        try {
            console.log('✅ Rating transaction confirmed');
            
            // Wait for blockchain state to propagate
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // 1. Check achievements for the person being rated (matchAddress is always a string)
            await checkAndMintAchievements(matchAddress);
            
            // 2. FIXED: Check for the rater only if address is defined
            if (address) {
                console.log(`🏆 Checking achievements for rater: ${address}`);
                await checkAndMintAchievements(address);
            }
            
            console.log('✅ Achievement check completed');
            if (onSuccess) onSuccess();
            
            setTimeout(() => onClose(), 2000);
            
        } catch (error) {
            console.error('❌ Error processing rating completion:', error);
            setTimeout(() => onClose(), 2000);
        } finally {
            setIsProcessingAchievements(false);
        }
    };

    const checkAndMintAchievements = async (userAddress: string) => {
        try {
            const response = await fetch('/api/achievements/auto-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress }),
            });
            const data = await response.json();
            
            if (data.mintedAchievements?.length > 0) {
                const successfulMints = data.mintedAchievements.filter((a: any) => a.status === 'success');
                if (successfulMints.length > 0 && userAddress.toLowerCase() === matchAddress.toLowerCase()) {
                    showNotification('🌟 Your date just earned a 5-Star Achievement!', 'success');
                }
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
                        className="text-gray-400 hover:text-gray-600"
                        disabled={isPending || isConfirming || isProcessingAchievements}
                    >
                        <X size={24} />
                    </button>
                </div>

                {isProcessingAchievements ? (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Checking Achievements...</h3>
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
                                        className="text-5xl transition-transform hover:scale-110"
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
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                                disabled={isPending || isConfirming}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending || isConfirming || rating === 0}
                                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                            >
                                {isPending || isConfirming ? 'Submitting...' : 'Submit Rating'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
