'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi } from 'viem';
import { Heart, X, Lock, CheckCircle, Loader2, Calendar, DollarSign, Hash } from 'lucide-react';

interface DateStakeAcceptModalProps {
    stakeId: string;
    matchedUserName: string;
    stakeAmount: string;
    meetingTime: number;
    currentUserName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DateStakeAcceptModal({
    stakeId,
    matchedUserName,
    stakeAmount,
    meetingTime,
    currentUserName,
    onClose,
    onSuccess,
}: DateStakeAcceptModalProps) {
    const { address } = useAccount();

    const { writeContract: approveUSDC, data: approvalHash, isPending: isApprovePending } = useWriteContract();
    const { writeContract: acceptStakeContract, data: acceptHash, isPending: isAcceptPending } = useWriteContract();

    const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
        hash: approvalHash
    });
    const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({
        hash: acceptHash
    });

    const [error, setError] = useState('');
    const [step, setStep] = useState<'confirm' | 'approval' | 'accepting' | 'success'>('confirm');
    const [hasProcessedSuccess, setHasProcessedSuccess] = useState(false);

    const amount = parseUnits(stakeAmount, 6);

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        chainId: 84532,
        address: CONTRACTS.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address || '0x0', CONTRACTS.STAKING as `0x${string}`],
    });

    // FIXED: Handle approval success - automatically proceed to accept stake
    useEffect(() => {
        if (isApprovalSuccess && step === 'approval' && !hasProcessedSuccess) {
            console.log('✅ Approval confirmed, proceeding to accept stake');
            setHasProcessedSuccess(true);

            // Refetch allowance to ensure it's updated
            refetchAllowance().then(() => {
                // Small delay to ensure blockchain state is updated
                setTimeout(() => {
                    handleAcceptStake();
                }, 500);
            });
        }
    }, [isApprovalSuccess, step, hasProcessedSuccess]);

    // Handle accept stake success
    useEffect(() => {
        if (isAcceptSuccess && step === 'accepting') {
            console.log('✅ Stake accepted!');
            setStep('success');

            // Sync to database
            syncStakeToDatabase();
            // Send notification to the stake creator
            sendAcceptanceNotification();
        }
    }, [isAcceptSuccess, step]);

    const syncStakeToDatabase = async () => {
        try {
            console.log('🔄 Syncing stake to database after acceptance...');
            const response = await fetch('/api/stakes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: address })
            });

            const result = await response.json();
            console.log('🔄 Stake sync result:', result);

            // Trigger achievement minting for both users after successful sync
            if (result.success) {
                triggerAchievementMinting();
            }
        } catch (error) {
            console.error('❌ Failed to sync stake:', error);
        }
    };

    const triggerAchievementMinting = async () => {
        try {
            // Get the stake data to determine both users
            const response = await fetch(`/api/stakes/${stakeId}`);
            const data = await response.json();

            if (data.success && data.stake) {
                // Trigger achievement minting for the current user (acceptor)
                await fetch('/api/achievements/auto-mint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userAddress: address })
                });

                // Also trigger for the stake creator
                const creatorAddress = data.stake.user1_address.toLowerCase() === address?.toLowerCase()
                    ? data.stake.user2_address
                    : data.stake.user1_address;

                await fetch('/api/achievements/auto-mint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userAddress: creatorAddress })
                });
            }
        } catch (error) {
            console.error('Failed to trigger achievement minting:', error);
        }
    };

    const sendAcceptanceNotification = async () => {
        try {
            console.log('📬 Sending acceptance notification for stake:', stakeId);

            const response = await fetch(`/api/stakes/${stakeId}`);
            const data = await response.json();
            console.log('📥 Stake data response:', data);

            if (data.success && data.stake) {
                // Determine the other user (the one who created the stake)
                const otherUserAddress = data.stake.user1_address.toLowerCase() === address?.toLowerCase()
                    ? data.stake.user2_address
                    : data.stake.user1_address;

                console.log('👥 Notifying other user:', otherUserAddress);

                const notificationResponse = await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userAddress: otherUserAddress,
                        type: 'date_stake_accepted',
                        title: '🎉 Date Confirmed!',
                        message: `${currentUserName || 'Someone'} accepted the stake. Your date is locked in!`, // Use currentUserName
                        metadata: {
                            stake_id: stakeId,
                            acceptor_address: address?.toLowerCase(),
                            stake_amount: stakeAmount,
                            meeting_timestamp: meetingTime
                        }
                    })
                });

                const notificationResult = await notificationResponse.json();
                console.log('📬 Notification result:', notificationResult);

                if (!notificationResponse.ok) {
                    console.error('❌ Failed to send notification:', notificationResult.error);
                }
            } else {
                console.error('❌ Failed to get stake data:', data.error);
            }
        } catch (error) {
            console.error('❌ Failed to send notification:', error);
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        setHasProcessedSuccess(false);
        try {
            setStep('approval');
            approveUSDC({
                chainId: 84532,
                address: CONTRACTS.USDC as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [CONTRACTS.STAKING as `0x${string}`, amount],
            });
        } catch (err) {
            console.error('Approval error:', err);
            setError('Failed to approve USDC');
            setStep('confirm');
        }
    };

    const handleAcceptStake = async () => {
        setError('');

        // Check if approval is needed
        if (!allowance || allowance < amount) {
            handleApproveUSDC();
            return;
        }

        try {
            setStep('accepting');

            acceptStakeContract({
                chainId: 84532,
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'acceptStake',
                args: [BigInt(stakeId)],
            });
        } catch (err) {
            console.error('Accept stake error:', err);
            setError('Failed to accept stake');
            setStep('confirm');
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Heart className="text-pink-500" size={28} />
                        Accept Date Stake
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isApprovalConfirming || isAcceptConfirming}
                    >
                        <X size={24} />
                    </button>
                </div>

                {step === 'approval' && (
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <Lock className="text-blue-500" size={48} />
                                {(isApprovePending || isApprovalConfirming) && (
                                    <Loader2 className="absolute -top-1 -right-1 text-blue-500 animate-spin" size={20} />
                                )}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                        <p className="text-gray-600 mb-6">
                            Approve the contract to spend {stakeAmount} USDC.
                        </p>
                        {(isApprovePending || isApprovalConfirming) && (
                            <div className="text-center py-4">
                                <p className="text-gray-600">
                                    {isApprovePending ? 'Waiting for wallet confirmation...' : 'Confirming on blockchain...'}
                                </p>
                            </div>
                        )}
                        {!isApprovePending && !isApprovalConfirming && (
                            <button
                                onClick={() => {
                                    console.log('🔄 Manually checking approval status...');
                                    // Refetch allowance to ensure it's updated
                                    refetchAllowance().then(() => {
                                        // Small delay to ensure blockchain state is updated
                                        setTimeout(() => {
                                            handleAcceptStake();
                                        }, 500);
                                    });
                                }}
                                className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                                Click here if transaction is already confirmed
                            </button>
                        )}
                    </div>
                )}
                {step === 'accepting' && (
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <Loader2 className="text-pink-500 animate-spin" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Accepting Stake</h3>
                        <p className="text-gray-600">
                            {isAcceptPending ? 'Waiting for wallet confirmation...' : 'Processing transaction...'}
                        </p>
                        {!isAcceptPending && !isAcceptConfirming && (
                            <button
                                onClick={() => {
                                    console.log('🔄 Manually checking accept stake status...');
                                    // Set step to success to proceed with post-processing
                                    setStep('success');

                                    // Sync to database
                                    syncStakeToDatabase();
                                    // Send notification to the stake creator
                                    sendAcceptanceNotification();
                                }}
                                className="mt-4 text-sm text-pink-600 hover:text-pink-800 underline"
                            >
                                Click here if transaction is already confirmed
                            </button>
                        )}
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <CheckCircle className="text-green-500" size={64} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Date Confirmed!</h3>
                        <p className="text-gray-600 mb-6">You've accepted the stake. Good luck on your date!</p>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                )}

                {step === 'confirm' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
                            <div className="flex items-center gap-3 mb-3">
                                <Heart className="text-pink-600" size={24} />
                                <div>
                                    <p className="font-bold text-gray-900">{matchedUserName}</p>
                                    <p className="text-sm text-gray-600">wants to go on a date with you!</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        <Calendar size={14} />
                                        Date:
                                    </span>
                                    <span className="font-semibold text-gray-900">{formatDate(meetingTime)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        <DollarSign size={14} />
                                        Your stake:
                                    </span>
                                    <span className="font-semibold text-pink-600">{stakeAmount} USDC</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        <Hash size={14} />
                                        Stake ID:
                                    </span>
                                    <span className="font-mono text-xs text-gray-500">#{stakeId}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                                💡 Both stake {stakeAmount} USDC. Show up → get 95-142.5% back. Can't make it → 20% compassion refund.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 border border-gray-300 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcceptStake}
                                disabled={isAcceptPending}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                            >
                                Accept & Stake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
