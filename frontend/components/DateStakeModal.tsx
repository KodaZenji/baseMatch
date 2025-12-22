'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi, Log } from 'viem';
import { Heart, X, Lock, CheckCircle2, Loader2, PartyPopper, DollarSign, Calendar, Clock } from 'lucide-react';

interface DateStakeModalProps {
    matchedUserAddress: string;
    matchedUserName: string;
    currentUserAddress: string;
    currentUserName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DateStakeModal({
    matchedUserAddress,
    matchedUserName,
    currentUserAddress,
    currentUserName,
    onClose,
    onSuccess,
}: DateStakeModalProps) {
    const { address } = useAccount();
    const publicClient = usePublicClient();

    const { writeContract: approveUSDC, data: approvalHash, isPending: isApprovePending, isSuccess: isApproveSuccess } = useWriteContract();
    const { writeContract: createStakeContract, data: stakeHash, isPending: isStakePending, isSuccess: isCreateStakeSuccess } = useWriteContract();

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
    const [step, setStep] = useState<'form' | 'approval' | 'confirming' | 'staking' | 'success'>('form');
    const [meetingTimestamp, setMeetingTimestamp] = useState<number>(0);

    const { data: allowance } = useReadContract({
        chainId: 84532,
        address: CONTRACTS.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [(currentUserAddress as `0x${string}`) || ('0x0' as `0x${string}`), CONTRACTS.STAKING as `0x${string}`],
    });

    // Set default date and time on mount
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setMeetingDate(tomorrow.toISOString().split('T')[0]);
        setMeetingTime('19:00'); // Default to 7 PM
    }, []);

    useEffect(() => {
        if (isApprovalSuccess && step === 'approval') {
            console.log('✅ Approval confirmed, proceeding to stake creation...');
            setStep('confirming');
            // Auto-proceed to create stake after approval
            setTimeout(() => {
                handleCreateStakeAfterApproval();
            }, 1000);
        }
    }, [isApprovalSuccess, step]);

    // Handle approval write success (before transaction confirmation)
    useEffect(() => {
        if (isApproveSuccess && step === 'approval' && !isApprovalConfirming) {
            console.log('📝 Approval transaction submitted, waiting for confirmation...');
        }
    }, [isApproveSuccess, step, isApprovalConfirming]);
    useEffect(() => {
        if (isStakeSuccess && stakeHash && publicClient) {
            console.log('✅ Stake created, extracting ID from blockchain...');
            extractStakeIdAndSync();
        }
    }, [isStakeSuccess, stakeHash, publicClient]);

    const extractStakeIdAndSync = async () => {
        try {
            const receipt = await publicClient!.waitForTransactionReceipt({
                hash: stakeHash!
            });

            console.log('📜 Got transaction receipt, parsing logs...');

            // Find the log from the staking contract
            const stakeLog = receipt.logs.find((log: Log) => {
                return log.address.toLowerCase() === CONTRACTS.STAKING.toLowerCase();
            });

            if (stakeLog && stakeLog.topics[1]) {
                // The stakeId is in topics[1] (first indexed parameter after event signature)
                const stakeId = BigInt(stakeLog.topics[1]).toString();
                console.log('🎯 Extracted stake ID:', stakeId);

                await syncStakeToDatabase(stakeId);
                await sendStakeNotification(stakeId);

                setStep('success');
                return;
            }

            // Fallback: Query recent events
            console.log('⚠️ Event not found in logs, trying fallback...');
            await fallbackQueryMethod();

        } catch (error) {
            console.error('❌ Error extracting stake ID:', error);
            setStep('success'); // Still show success to user
        }
    };

    const fallbackQueryMethod = async () => {
        try {
            const currentBlock = await publicClient!.getBlockNumber();
            const fromBlock = currentBlock - 100n;

            const logs = await publicClient!.getLogs({
                address: CONTRACTS.STAKING as `0x${string}`,
                fromBlock,
                toBlock: 'latest'
            });

            // Find the most recent log from this transaction
            for (let i = logs.length - 1; i >= 0; i--) {
                const log = logs[i];

                // Check if this log is from our transaction
                if (log.transactionHash?.toLowerCase() === stakeHash?.toLowerCase()) {
                    const stakeId = BigInt(log.topics[1]!).toString();
                    console.log('🎯 Found stake ID via fallback:', stakeId);

                    await syncStakeToDatabase(stakeId);
                    await sendStakeNotification(stakeId);
                    setStep('success');
                    return;
                }
            }

            console.log('⚠️ Could not find matching stake event');
            setStep('success');
        } catch (error) {
            console.error('❌ Fallback failed:', error);
            setStep('success');
        }
    };

    const syncStakeToDatabase = async (stakeId: string) => {
        try {
            console.log('💾 Syncing stake to database via API:', stakeId);

            const response = await fetch('/api/stakes/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stakeId,
                    userAddress: currentUserAddress,
                    matchAddress: matchedUserAddress,
                    stakeAmount: parseFloat(stakeAmount),
                    meetingTimestamp
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Stake synced to database successfully');
            } else {
                console.error('❌ Database sync error:', result.error);
            }
        } catch (error) {
            console.error('❌ Failed to sync stake to database:', error);
        }
    };

    const sendStakeNotification = async (stakeId: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: matchedUserAddress.toLowerCase(),
                    type: 'date_stake_created',
                    title: '💕 New Date Stake!',
                    message: `${currentUserName || 'Someone'} wants to go on a date with you!`,
                    metadata: {
                        stake_id: stakeId,
                        sender_address: currentUserAddress?.toLowerCase(),
                        sender_name: currentUserName || 'User',
                        stake_amount: stakeAmount,
                    }
                })
            }); console.log('📬 Notification sent');
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        const amount = parseUnits(stakeAmount, 6);

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
            setError('Failed to approve USDC. Please try again.');
            setStep('form');
        }
    };
    const handleCreateStakeAfterApproval = async () => {
        try {
            setStep('staking');
            const amount = parseUnits(stakeAmount, 6);

            createStakeContract({
                chainId: 84532,
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'createStake',
                args: [matchedUserAddress as `0x${string}`, amount, BigInt(meetingTimestamp)],
            });
        } catch (err) {
            console.error('Stake creation error:', err);
            setError('Failed to create stake. Please try again.');
            setStep('form');
        }
    };
    const handleCreateStake = async () => {
        setError('');

        if (!stakeAmount || parseFloat(stakeAmount) < 10) {
            setError('Minimum stake amount is 10 USDC');
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
        setMeetingTimestamp(timestamp);
        const amount = parseUnits(stakeAmount, 6);

        // Check if approval is needed
        if (!allowance || allowance < amount) {
            console.log('⚠️ Insufficient allowance, requesting approval...');
            handleApproveUSDC();
            return;
        }

        // If already approved, create stake directly
        try {
            setStep('staking');
            createStakeContract({
                chainId: 84532,
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
                    <div className="flex items-center gap-2">
                        <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                        <h2 className="text-2xl font-bold text-gray-900">Plan a Date</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isApprovalConfirming || isStakeConfirming}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {step === 'approval' && (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-pink-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                        <p className="text-gray-600 mb-6">
                            Please approve the contract to spend {stakeAmount} USDC.
                        </p>
                        <div className="text-center py-4">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-4" />
                            <p className="text-gray-600">
                                {isApprovePending ? 'Waiting for wallet confirmation...' : 'Confirming approval on blockchain...'}
                            </p>
                            {!isApprovePending && !isApprovalConfirming && (
                                <button
                                    onClick={() => {
                                        console.log('🔄 Manually checking approval status...');
                                        setStep('confirming');
                                        setTimeout(() => {
                                            handleCreateStakeAfterApproval();
                                        }, 1000);
                                    }}
                                    className="mt-4 text-sm text-pink-600 hover:text-pink-800 underline"
                                >
                                    Click here if transaction is already confirmed
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {step === 'confirming' && (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Approved!</h3>
                        <p className="text-gray-600 mb-4">Creating your stake now...</p>
                        <Loader2 className="w-6 h-6 text-pink-500 animate-spin mx-auto" />
                    </div>
                )}

                {step === 'staking' && (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="w-8 h-8 text-purple-600 fill-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Creating Stake</h3>
                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">
                            {isStakePending ? 'Waiting for wallet confirmation...' : 'Processing on blockchain...'}
                        </p>
                        {!isStakePending && !isStakeConfirming && (
                            <button
                                onClick={() => {
                                    console.log('🔄 Manually checking stake creation status...');
                                    setStep('success');
                                    // Try to extract stake ID and sync anyway
                                    if (stakeHash && publicClient) {
                                        setTimeout(() => {
                                            extractStakeIdAndSync();
                                        }, 500);
                                    }
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
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PartyPopper className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Stake Created!</h3>
                        <p className="text-gray-600 mb-6">{matchedUserName} has been notified!</p>
                        <button
                            onClick={() => { onSuccess(); onClose(); }}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                        >
                            Done
                        </button>
                    </div>
                )}

                {step === 'form' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                            <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800">
                                Both stake USDC. Show up → get 95-142.5% back. Ghost → 20% compassion refund.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-600" />
                                Stake Amount (USDC)
                            </label>
                            <input
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                min="10"
                                step="1"
                                placeholder="10"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            />
                            <p className="text-xs text-gray-600 mt-1">Minimum: 10 USDC</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                Meeting Date
                            </label>
                            <input
                                type="date"
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-600" />
                                Meeting Time
                            </label>
                            <input
                                type="time"
                                value={meetingTime}
                                onChange={(e) => setMeetingTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
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
                                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateStake}
                                disabled={isStakePending || isApprovePending}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-purple-700 transition-all font-semibold flex items-center justify-center gap-2"
                            >
                                {(isStakePending || isApprovePending) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Heart className="w-4 h-4 fill-white" />
                                )}
                                Create Stake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
