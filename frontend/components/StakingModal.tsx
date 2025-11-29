'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits } from 'viem';

interface StakingModalProps {
    matchAddress: string;
    onClose: () => void;
}

export default function StakingModal({ matchAddress, onClose }: StakingModalProps) {
    const [amount, setAmount] = useState('10');
    const [meetingTime, setMeetingTime] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !meetingTime) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        const meetingTimestamp = new Date(meetingTime).getTime() / 1000;
        const stakeAmount = parseUnits(amount, 6); // USDC has 6 decimals

        try {
            writeContract({
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'createStake',
                args: [matchAddress as `0x${string}`, stakeAmount, BigInt(meetingTimestamp)],
            });
        } catch (error) {
            console.error('Error creating stake:', error);
            showNotification('Failed to create stake', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    useEffect(() => {
        if (isSuccess) {
            showNotification('Stake created successfully!', 'success');
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 2000);
        }
    }, [isSuccess, onClose]);

    useEffect(() => {
        if (isError && error) {
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [isError, error]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Date with Stake</h2>
                <p className="text-gray-600 mb-6">
                    Optional: Stake USDC to encourage both parties to show up. Get your stake back when you both confirm!
                </p>

                {/* Notification */}
                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stake Amount (USDC)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            placeholder="10"
                            min="1"
                            step="0.01"
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Minimum: $5 USDC
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Meeting Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                        <p className="font-semibold mb-2">How it works:</p>
                        <ul className="space-y-1 text-xs">
                            <li>✓ Both confirm: 100% refund to each</li>
                            <li>✓ One confirms: 150% to confirmer, 50% to no-show</li>
                            <li>✓ Platform fee: 5% on successful confirmations</li>
                        </ul>
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
                            disabled={isPending || isConfirming}
                            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isPending || isConfirming ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </span>
                            ) : (
                                'Create Stake'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}