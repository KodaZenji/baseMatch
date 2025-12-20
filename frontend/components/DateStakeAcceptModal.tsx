'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi } from 'viem';
import { Heart } from 'lucide-react';

interface DateStakeAcceptModalProps {
    stakeId: string;
    matchedUserName: string;
    stakeAmount: string;
    meetingTime: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DateStakeAcceptModal({
    stakeId,
    matchedUserName,
    stakeAmount,
    meetingTime,
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
    const [step, setStep] = useState<'confirm' | 'approval' | 'confirming' | 'accepting' | 'success'>('confirm');

    const amount = parseUnits(stakeAmount, 6);

    const { data: allowance } = useReadContract({
        chainId: 84532,
        address: CONTRACTS.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address || '0x0', CONTRACTS.STAKING as `0x${string}`],
    });

    useEffect(() => {
        if (isApprovalSuccess && step === 'approval') {
            console.log('✅ Approval confirmed');
            setStep('confirming');
        }
    }, [isApprovalSuccess, step]);

    useEffect(() => {
        if (isAcceptSuccess) {
            console.log('✅ Stake accepted!');
            setStep('success');
            
            // Sync to database
            syncStakeToDatabase();
            sendAcceptanceNotification();
        }
    }, [isAcceptSuccess]);

    const syncStakeToDatabase = async () => {
        try {
            // Trigger a sync for this user to update the stake status
            await fetch('/api/stakes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: address })
            });
        } catch (error) {
            console.error('Failed to sync stake:', error);
        }
    };

    const sendAcceptanceNotification = async () => {
        try {
            // Get the other user's address from the stake
            const response = await fetch(`/api/stakes/${stakeId}`);
            const data = await response.json();
            
            if (data.success && data.stake) {
                const otherUserAddress = data.stake.user1_address.toLowerCase() === address?.toLowerCase() 
                    ? data.stake.user2_address 
                    : data.stake.user1_address;

                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userAddress: otherUserAddress,
                        type: 'date_stake_accepted',
                        title: '🎉 Date Confirmed!',
                        message: `${matchedUserName} accepted the stake. Your date is locked in!`,
                        metadata: {
                            stake_id: stakeId,
                            acceptor_address: address?.toLowerCase(),
                            stake_amount: stakeAmount,
                            meeting_timestamp: meetingTime
                        }
                    })
                });
            }
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        try {
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
        }
    };

    const handleAcceptStake = async () => {
        setError('');

        // Check if approval is needed
        if (!allowance || allowance < amount) {
            setStep('approval');
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
                    <h2 className="text-2xl font-bold text-gray-900">💕 Accept Date Stake</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                        disabled={isApprovalConfirming || isAcceptConfirming}
                    >
                        ✕
                    </button>
                </div>

                {step === 'approval' && (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🔐</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                        <p className="text-gray-600 mb-6">
                            Approve the contract to spend {stakeAmount} USDC.
                        </p>
                        {isApprovePending || isApprovalConfirming ? (
                            <div className="text-center py-4">
                                <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-600">
                                    {isApprovePending ? 'Waiting for wallet...' : 'Confirming...'}
                                </p>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setStep('confirm')} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                                    Back
                                </button>
                                <button onClick={handleApproveUSDC} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg">
                                    Approve
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'confirming' && (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">✅</p>
                        <h3 className="text-xl font-bold mb-2">Approved!</h3>
                        <p className="text-gray-600 mb-6">Ready to accept the stake?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setStep('confirm')} className="flex-1 border px-4 py-2 rounded-lg">Back</button>
                            <button onClick={handleAcceptStake} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg">
                                Accept Stake
                            </button>
                        </div>
                    </div>
                )}

                {step === 'accepting' && (
                    <div className="text-center py-6">
                        <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">{isAcceptPending ? 'Waiting for wallet...' : 'Accepting stake...'}</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold mb-2">Date Confirmed!</h3>
                        <p className="text-gray-600 mb-6">You've accepted the stake. Good luck on your date!</p>
                        <button onClick={() => { onSuccess(); onClose(); }} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg">
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
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Date:</span>
                                    <span className="font-semibold text-gray-900">{formatDate(meetingTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Your stake:</span>
                                    <span className="font-semibold text-pink-600">{stakeAmount} USDC</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Stake ID:</span>
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
                            <button onClick={onClose} className="flex-1 border px-4 py-3 rounded-lg font-semibold">
                                Cancel
                            </button>
                            <button 
                                onClick={handleAcceptStake} 
                                disabled={isAcceptPending} 
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
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
