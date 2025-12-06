'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits } from 'viem';

interface DateStakeModalProps {
    matchedUserAddress: string;
    matchedUserName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DateStakeModal({
    matchedUserAddress,
    matchedUserName,
    onClose,
    onSuccess,
}: DateStakeModalProps) {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const [stakeAmount, setStakeAmount] = useState('10');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'form' | 'confirm'>('form');

    const handleCreateStake = async () => {
        setError('');

        // Validation
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
            setError('Please enter a valid stake amount');
            return;
        }
        if (!meetingDate || !meetingTime) {
            setError('Please select a meeting date and time');
            return;
        }

        // Check if date is in the future
        const selectedDateTime = new Date(`${meetingDate}T${meetingTime}`);
        if (selectedDateTime <= new Date()) {
            setError('Meeting must be in the future');
            return;
        }

        // Convert to Unix timestamp
        const timestamp = Math.floor(selectedDateTime.getTime() / 1000);

        // Convert amount to USDC (6 decimals)
        const amount = parseUnits(stakeAmount, 6);

        try {
            if (!CONTRACTS.STAKING || !address) {
                setError('Staking contract not configured or wallet not connected');
                return;
            }

            console.log('📤 Creating stake:', {
                matchedUser: matchedUserAddress,
                amount: amount.toString(),
                meetingTime: timestamp,
            });

            writeContract({
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'createStake',
                args: [matchedUserAddress as `0x${string}`, amount, BigInt(timestamp)],
            });

            setStep('confirm');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create stake');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">💕 Plan a Date</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {isSuccess ? (
                    // Success state
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Date Stake Created!</h3>
                        <p className="text-gray-600 mb-6">
                            Your stake has been created. {matchedUserName} will receive a notification and can confirm the meeting.
                        </p>
                        <button
                            onClick={onSuccess}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                ) : isConfirming ? (
                    // Confirming state
                    <div className="text-center py-6">
                        <div className="inline-block">
                            <svg
                                className="animate-spin h-8 w-8 text-pink-500 mx-auto mb-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        </div>
                        <p className="text-gray-600">Confirming transaction...</p>
                    </div>
                ) : (
                    // Form state
                    <div>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>How it works:</strong> Stake USDC as a commitment token for your date. If both of you confirm the meeting happened, your stake is refunded (minus a small platform fee). If only one confirms, the confirmer gets a bonus!
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Stake Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Stake Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    placeholder="10"
                                    min="0"
                                    step="1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Suggested: 10 USDC</p>
                            </div>

                            {/* Meeting Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Meeting Date
                                </label>
                                <input
                                    type="date"
                                    value={meetingDate}
                                    onChange={(e) => setMeetingDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            {/* Meeting Time */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Meeting Time
                                </label>
                                <input
                                    type="time"
                                    value={meetingTime}
                                    onChange={(e) => setMeetingTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateStake}
                                    disabled={isWritePending}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isWritePending ? 'Processing...' : `Create Stake (${stakeAmount} USDC)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
