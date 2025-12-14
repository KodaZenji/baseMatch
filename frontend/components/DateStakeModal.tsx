'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi } from 'viem';

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
    
    // Separate write contracts for approval and staking
    const { writeContract: approveUSDC, data: approvalHash, isPending: isApprovePending } = useWriteContract();
    const { writeContract: createStakeContract, data: stakeHash, isPending: isStakePending } = useWriteContract();
    
    // Track both transactions separately
    const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ 
        hash: approvalHash 
    });
    const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ 
        hash: stakeHash 
    });

    const [stakeAmount, setStakeAmount] = useState('10');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'form' | 'approval' | 'staking' | 'success'>('form');
    const [meetingTimestamp, setMeetingTimestamp] = useState<number>(0);

    // Check USDC allowance - refetch after approval
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address || '0x0', CONTRACTS.STAKING as `0x${string}`],
    });

    // FIX 1: Handle approval success - automatically proceed to staking
    useEffect(() => {
        if (isApprovalSuccess && step === 'approval') {
            console.log('✅ Approval confirmed on-chain');
            
            // Refetch allowance to verify
            refetchAllowance().then(() => {
                console.log('✅ Allowance refetched, proceeding to stake creation');
                // Auto-proceed to staking
                setTimeout(() => {
                    handleCreateStake();
                }, 1000);
            });
        }
    }, [isApprovalSuccess, step]);

    // FIX 2: Handle stake success - create notification for matched user
    useEffect(() => {
        if (isStakeSuccess && address) {
            console.log('✅ Stake created successfully');
            
            // Create notification for the matched user
            sendStakeNotification();
            
            // Show success screen
            setStep('success');
        }
    }, [isStakeSuccess, address]);

    const sendStakeNotification = async () => {
        try {
            const response = await fetch('/api/notifications/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: matchedUserAddress.toLowerCase(),
                    type: 'date_stake_created',
                    title: '💕 New Date Stake!',
                    message: `${matchedUserName || 'Someone'} created a stake for your date on ${new Date(meetingTimestamp * 1000).toLocaleString()}`,
                    metadata: {
                        sender_address: address?.toLowerCase(),
                        stake_amount: stakeAmount,
                        meeting_timestamp: meetingTimestamp,
                        meeting_date: meetingDate,
                        meeting_time: meetingTime,
                    }
                })
            });

            if (!response.ok) {
                console.error('Failed to send notification:', await response.text());
            } else {
                console.log('✅ Notification sent to matched user');
            }
        } catch (error) {
            console.error('Error sending stake notification:', error);
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        const amount = parseUnits(stakeAmount, 6);

        try {
            console.log('📤 Requesting USDC approval for:', amount.toString());
            
            approveUSDC({
                address: CONTRACTS.USDC as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [CONTRACTS.STAKING as `0x${string}`, amount],
            });
        } catch (err) {
            console.error('Approval error:', err);
            setError('Failed to approve USDC. Please try again.');
        }
    };

    const handleCreateStake = async () => {
        setError('');

        // Validation
        if (!stakeAmount || parseFloat(stakeAmount) < 5) {
            setError('Minimum stake amount is 5 USDC');
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
        setMeetingTimestamp(timestamp);

        // Convert amount to USDC (6 decimals)
        const amount = parseUnits(stakeAmount, 6);

        if (!CONTRACTS.STAKING || !address) {
            setError('Unable to process. Please reconnect your wallet.');
            return;
        }

        // Check if approval is needed
        if (!allowance || allowance < amount) {
            setStep('approval');
            return;
        }

        // Proceed with stake creation
        try {
            console.log('📤 Creating stake:', {
                matchedUser: matchedUserAddress,
                amount: amount.toString(),
                meetingTime: timestamp,
            });

            setStep('staking');

            createStakeContract({
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'createStake',
                args: [matchedUserAddress as `0x${string}`, amount, BigInt(timestamp)],
            });
        } catch (err) {
            console.error('Stake creation error:', err);
            setError('Failed to create stake. Please try again.');
            setStep('form');
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
                        disabled={isApprovalConfirming || isStakeConfirming}
                    >
                        ✕
                    </button>
                </div>

                {step === 'approval' ? (
                    // USDC Approval state
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🔐</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                        <p className="text-gray-600 mb-6">
                            To proceed with staking, you need to approve the Staking contract to spend {stakeAmount} USDC on your behalf.
                        </p>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                        
                        {isApprovePending || isApprovalConfirming ? (
                            <div className="text-center py-4">
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
                                <p className="text-gray-600 font-medium">
                                    {isApprovePending ? 'Waiting for wallet confirmation...' : 'Confirming approval on blockchain...'}
                                </p>
                                <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
                            </div>
                        ) : (
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => {
                                        setStep('form');
                                        setError('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleApproveUSDC}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Approve USDC
                                </button>
                            </div>
                        )}
                    </div>
                ) : step === 'staking' ? (
                    // Staking in progress
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
                        <p className="text-gray-600 font-medium">
                            {isStakePending ? 'Waiting for wallet confirmation...' : 'Creating your date stake...'}
                        </p>
                        <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
                    </div>
                ) : step === 'success' ? (
                    // Success state
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Date Stake Created!</h3>
                        <p className="text-gray-600 mb-4">
                            Your stake has been created for <strong>{new Date(meetingTimestamp * 1000).toLocaleString()}</strong>
                        </p>
                        <p className="text-gray-600 mb-6">
                            {matchedUserName} has been notified and will receive the meeting details. Both of you will need to confirm after the date occurs!
                        </p>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    // Form state
                    <div>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>How it works:</strong> Stake USDC as a commitment token. Both parties must confirm the meeting occurred. Show up and confirm → get refunded + bonus. Ghost → lose stake.
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
                                    min="5"
                                    step="1"
                                    className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum: 5 USDC (Suggested: 10 USDC)</p>
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
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                                    className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                                    disabled={isStakePending || isApprovalConfirming}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isStakePending ? 'Processing...' : `Create Stake (${stakeAmount} USDC)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
