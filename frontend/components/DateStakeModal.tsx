'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi } from 'viem';
import { supabaseClient } from '@/lib/supabase/client';

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

    const { writeContract: approveUSDC, data: approvalHash, isPending: isApprovePending } = useWriteContract();
    const { writeContract: createStakeContract, data: stakeHash, isPending: isStakePending } = useWriteContract();

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

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address || '0x0', CONTRACTS.STAKING as `0x${string}`],
    });

    // Handle approval success
    useEffect(() => {
        if (isApprovalSuccess && step === 'approval') {
            console.log('✅ Approval confirmed');
            refetchAllowance().then(() => {
                setTimeout(() => {
                    handleCreateStake();
                }, 1000);
            });
        }
    }, [isApprovalSuccess, step]);

    // Handle stake success
    useEffect(() => {
        if (isStakeSuccess && address) {
            console.log('✅ Stake created successfully');
            setStep('success');

            // Send notification and sync database in background (non-blocking)
            sendStakeNotification().catch(console.error);
            syncStakeToDatabase().catch(console.error);
        }
    }, [isStakeSuccess, address, stakeAmount, meetingTimestamp]);

    const sendStakeNotification = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: matchedUserAddress.toLowerCase(),
                    type: 'date_stake_created',
                    title: '💕 New Date Stake!',
                    message: `${matchedUserName || 'Someone'} created a stake for a date`,
                    metadata: {
                        sender_address: address?.toLowerCase(),
                        stake_amount: stakeAmount,
                    }
                })
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    };

    const syncStakeToDatabase = async () => {
        try {
            // Query contract to get the stake ID from the transaction
            // For now, we'll save the stake with available data
            // The stake ID can be queried later from the contract
            await supabaseClient
                .from('stakes')
                .insert({
                    user1_address: address?.toLowerCase(),
                    user2_address: matchedUserAddress.toLowerCase(),
                    user1_amount: parseFloat(stakeAmount),
                    user2_amount: 0,
                    meeting_time: meetingTimestamp,
                    user1_staked: true,
                    user2_staked: false,
                    status: 'pending'
                });
            console.log('✅ Stake synced to database');
        } catch (error) {
            console.error('Failed to sync stake to database:', error);
            // Non-critical error - blockchain is source of truth
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        const amount = parseUnits(stakeAmount, 6);

        try {
            approveUSDC({
                address: CONTRACTS.USDC as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [CONTRACTS.STAKING as `0x${string}`, amount],
            });
        } catch (err: any) {
            console.error('Approval error:', err);
            setError('Failed to approve USDC. Please try again.');
        }
    };

    const handleCreateStake = async () => {
        setError('');

        if (!stakeAmount || parseFloat(stakeAmount) < 5) {
            setError('Minimum stake amount is 5 USDC');
            return;
        }
        if (!meetingDate || !meetingTime) {
            setError('Please select a meeting date and time');
            return;
        }

        const selectedDateTime = new Date(`${meetingDate}T${meetingTime}`);
        if (selectedDateTime <= new Date()) {
            setError('Meeting must be in the future');
            return;
        }

        const timestamp = Math.floor(selectedDateTime.getTime() / 1000);
        const amount = parseUnits(stakeAmount, 6);

        if (!CONTRACTS.STAKING || !address) {
            setError('Unable to process. Please reconnect your wallet.');
            return;
        }

        if (!allowance || allowance < amount) {
            setStep('approval');
            return;
        }

        try {
            console.log('📤 Creating stake with:', {
                user2: matchedUserAddress,
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
        } catch (err: any) {
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
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🔐</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                        <p className="text-gray-600 mb-6">
                            Approve the contract to spend {stakeAmount} USDC.
                        </p>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {isApprovePending || isApprovalConfirming ? (
                            <div className="text-center py-4">
                                <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-600 font-medium">
                                    {isApprovePending ? 'Waiting for wallet...' : 'Confirming approval...'}
                                </p>
                            </div>
                        ) : (
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setStep('form')}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleApproveUSDC}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                                >
                                    Approve USDC
                                </button>
                            </div>
                        )}
                    </div>
                ) : step === 'staking' ? (
                    <div className="text-center py-6">
                        <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600 font-medium">
                            {isStakePending ? 'Waiting for wallet...' : 'Creating stake...'}
                        </p>
                    </div>
                ) : step === 'success' ? (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Date Stake Created!</h3>
                        <p className="text-gray-600 mb-4">
                            Your stake of {stakeAmount} USDC has been created
                        </p>
                        <p className="text-gray-600 mb-6">
                            {matchedUserName} has been notified!
                        </p>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:opacity-90"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>How it works:</strong> Both stake USDC. Show up and confirm → get 95-142.5% back. Ghost → get 20% compassion refund.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Stake Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    placeholder="10 USDC"
                                    min="5"
                                    step="1"
                                    className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum: 10 USDC</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Meeting Date
                                </label>
                                <input
                                    type="date"
                                    value={meetingDate}
                                    onChange={(e) => setMeetingDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Meeting Time
                                </label>
                                <input
                                    type="time"
                                    value={meetingTime}
                                    onChange={(e) => setMeetingTime(e.target.value)}
                                    className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

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
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                                >
                                    Create Stake
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
