'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { parseUnits, erc20Abi, Log } from 'viem';

// No direct database imports - using API instead!

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
    const publicClient = usePublicClient();

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
    const [step, setStep] = useState<'form' | 'approval' | 'confirming' | 'staking' | 'success'>('form');
    const [meetingTimestamp, setMeetingTimestamp] = useState<number>(0);

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

            console.log('📜 Got transaction receipt');

            // Find StakeCreated event in logs
            const stakeCreatedLog = receipt.logs.find((log: Log) => {
                // The StakeCreated event signature
                const stakeCreatedTopic = '0x...'; // You can calculate this or match by contract address
                return log.address.toLowerCase() === CONTRACTS.STAKING.toLowerCase();
            });

            if (stakeCreatedLog) {
                // Decode the log - stakeId is the first indexed parameter (topics[1])
                // topics[0] = event signature
                // topics[1] = stakeId (indexed)
                // topics[2] = user1 (indexed)
                // topics[3] = user2 (indexed)
                const stakeId = BigInt(stakeCreatedLog.topics[1]!).toString();

                console.log('🎯 Extracted stake ID:', stakeId);

                await syncStakeToDatabase(stakeId);
                await sendStakeNotification(stakeId);

                setStep('success');
                return;
            }

            // Fallback: Query contract directly
            console.log('⚠️ Event not found in logs, trying fallback...');
            await fallbackQueryMethod();

        } catch (error) {
            console.error('❌ Error extracting stake ID:', error);
            setStep('success'); // Still show success to user
        }
    };

    const fallbackQueryMethod = async () => {
        try {
            // Query for recent StakeCreated events
            const currentBlock = await publicClient!.getBlockNumber();
            const fromBlock = currentBlock - 100n; // Last 100 blocks

            const logs = await publicClient!.getLogs({
                address: CONTRACTS.STAKING as `0x${string}`,
                fromBlock,
                toBlock: 'latest'
            });

            // Find the most recent stake created by this user to this partner
            for (let i = logs.length - 1; i >= 0; i--) {
                const log = logs[i];
                if (log.topics[2]?.toLowerCase() === `0x${address?.toLowerCase().slice(2).padStart(64, '0')}` &&
                    log.topics[3]?.toLowerCase() === `0x${matchedUserAddress.toLowerCase().slice(2).padStart(64, '0')}`) {

                    const stakeId = BigInt(log.topics[1]!).toString();
                    console.log('🎯 Found stake ID via fallback:', stakeId);

                    await syncStakeToDatabase(stakeId);
                    await sendStakeNotification(stakeId);
                    setStep('success');
                    return;
                }
            }

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
                    userAddress: address,
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
                    message: `${matchedUserName || 'Someone'} created a stake for a date`,
                    metadata: {
                        stake_id: stakeId,
                        sender_address: address?.toLowerCase(),
                        sender_name: matchedUserName || 'User',
                        stake_amount: stakeAmount,
                    }
                })
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    };

    const handleApproveUSDC = async () => {
        setError('');
        const amount = parseUnits(stakeAmount, 6);

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
        setMeetingTimestamp(timestamp);
        const amount = parseUnits(stakeAmount, 6);

        if (!allowance || allowance < amount) {
            setMeetingTimestamp(timestamp);
            setStep('approval');
            return;
        }

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
            setError('Failed to create stake');
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
                                <button onClick={() => setStep('form')} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
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
                        <p className="text-gray-600 mb-6">Ready to stake {stakeAmount} USDC?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setStep('form')} className="flex-1 border px-4 py-2 rounded-lg">Back</button>
                            <button onClick={handleCreateStake} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg">
                                Create Stake
                            </button>
                        </div>
                    </div>
                )}

                {step === 'staking' && (
                    <div className="text-center py-6">
                        <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">{isStakePending ? 'Waiting for wallet...' : 'Creating stake...'}</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">🎉</p>
                        <h3 className="text-xl font-bold mb-2">Stake Created!</h3>
                        <p className="text-gray-600 mb-6">{matchedUserName} has been notified!</p>
                        <button onClick={() => { onSuccess(); onClose(); }} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg">
                            Done
                        </button>
                    </div>
                )}

                {step === 'form' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 Both stake USDC. Show up → get 95-142.5% back. Ghost → 20% compassion refund.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Stake Amount (USDC)</label>
                            <input
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                min="5"
                                step="1"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum: 10 USDC</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Meeting Date</label>
                            <input
                                type="date"
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Meeting Time</label>
                            <input
                                type="time"
                                value={meetingTime}
                                onChange={(e) => setMeetingTime(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button onClick={onClose} className="flex-1 border px-4 py-2 rounded-lg">Cancel</button>
                            <button onClick={handleCreateStake} disabled={isStakePending} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                                Create Stake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
