// frontend/components/DateConfirmationModal.tsx
// FIXED: Wait for blockchain confirmation before checking achievements

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';
import { Heart, DollarSign, AlertTriangle, CheckCircle, X, Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

interface DateConfirmationModalProps {
    stakeId: string;
    matchAddress: string;
    matchName: string;
    meetingTime: number;
    stakeAmount: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DateConfirmationModal({
    stakeId,
    matchAddress,
    matchName,
    meetingTime,
    stakeAmount,
    onClose,
    onSuccess,
}: DateConfirmationModalProps) {
    const { address } = useAccount();
    const [iShowedUp, setIShowedUp] = useState<boolean | null>(null);
    const [partnerShowedUp, setPartnerShowedUp] = useState<boolean | null>(null);
    const [error, setError] = useState('');
    const [showRatingPrompt, setShowRatingPrompt] = useState(false);
    
    // ✅ NEW: Track blockchain confirmation status
    const [isProcessingBlockchain, setIsProcessingBlockchain] = useState(false);

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const meetingDate = new Date(meetingTime * 1000);
    const confirmationDeadline = new Date(meetingTime * 1000 + 48 * 60 * 60 * 1000);
    const isBeforeMeeting = Date.now() < meetingTime * 1000;
    const isAfterDeadline = Date.now() > confirmationDeadline.getTime();
    const canConfirm = !isBeforeMeeting && !isAfterDeadline;

    const calculatePayout = () => {
        if (iShowedUp === null || partnerShowedUp === null) return null;

        const stake = parseFloat(stakeAmount);
        const total = stake * 2;

        if (iShowedUp && partnerShowedUp) {
            return {
                you: stake * 0.95,
                partner: stake * 0.95,
                platform: total * 0.05,
                message: "Perfect! Both showed up 🎉",
                color: "green",
                outcome: "both_showed"
            };
        }

        if (iShowedUp && !partnerShowedUp) {
            return {
                you: stake * 1.425,
                partner: stake * 0.20,
                platform: total - (stake * 1.425) - (stake * 0.20),
                message: "You showed up! You'll be rewarded 💪",
                color: "blue",
                outcome: "you_showed"
            };
        }

        if (!iShowedUp && partnerShowedUp) {
            return {
                you: stake * 0.20,
                partner: stake * 1.425,
                platform: total - (stake * 0.20) - (stake * 1.425),
                message: "Life happens. You'll get 20% back 💙",
                color: "orange",
                outcome: "partner_showed"
            };
        }

        if (!iShowedUp && !partnerShowedUp) {
            return {
                you: stake * 0.20,
                partner: stake * 0.20,
                platform: total * 0.80,
                message: "Both honest about not showing - 20% compassion refund",
                color: "gray",
                outcome: "neither_showed"
            };
        }

        return null;
    };

    const payout = calculatePayout();
    const isConflict = iShowedUp === true && partnerShowedUp === false;

    const handleConfirm = async () => {
        if (!canConfirm) {
            setError('Confirmation window is not open yet or has closed');
            return;
        }

        if (iShowedUp === null || partnerShowedUp === null) {
            setError('Please answer both questions');
            return;
        }

        setError('');

        try {
            console.log('📤 Confirming date:', { stakeId, iShowedUp, partnerShowedUp });

            writeContract({
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'confirmMeeting',
                args: [BigInt(stakeId), iShowedUp, partnerShowedUp],
            });
        } catch (err) {
            console.error('Confirmation error:', err);
            setError('Failed to confirm. Please try again.');
        }
    };

    useEffect(() => {
        if (isSuccess) {
            console.log('✅ Blockchain confirmation successful');
            setIsProcessingBlockchain(true);
            
            // ✅ FIXED: Execute tasks in proper sequence
            processPostConfirmation();
        }
    }, [isSuccess]);

    // ✅ NEW: Properly sequenced post-confirmation flow
    const processPostConfirmation = async () => {
        try {
            // STEP 1: Update stakes table and send notification (can run in parallel)
            await Promise.all([
                updateStakesTable(),
                sendConfirmationNotification()
            ]);
            console.log('✅ Database and notifications updated');

            // STEP 2: Record date on blockchain (this takes time!)
            console.log('⏳ Recording date on blockchain...');
            const dateRecordResponse = await recordDateInDatabase();
            
            if (!dateRecordResponse.success) {
                console.error('❌ Failed to record date on blockchain');
                setIsProcessingBlockchain(false);
                return;
            }

            console.log('✅ Date recorded on blockchain');
            console.log('📊 Blockchain results:', dateRecordResponse.blockchain);

            // STEP 3: Wait additional time to ensure blockchain state is readable
            console.log('⏳ Waiting for blockchain state to propagate...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second buffer

            // STEP 4: NOW trigger achievement minting (blockchain state is updated)
            console.log('🏆 Now checking achievements...');
            await triggerAchievementMinting();
            
            console.log('✅ All post-confirmation tasks completed');
            setIsProcessingBlockchain(false);
            
            // Dispatch event to refresh the banner
            window.dispatchEvent(new CustomEvent('stakeConfirmed'));
            
            if (iShowedUp === true && partnerShowedUp === true) {
                setShowRatingPrompt(true);
            } else {
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Error in post-confirmation tasks:', error);
            setIsProcessingBlockchain(false);
            // Still proceed to close/show rating
            window.dispatchEvent(new CustomEvent('stakeConfirmed'));
            
            if (iShowedUp === true && partnerShowedUp === true) {
                setShowRatingPrompt(true);
            } else {
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        }
    };

    const sendConfirmationNotification = async () => {
        try {
            console.log('📧 Sending confirmation notification');
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: matchAddress.toLowerCase(),
                    type: 'date_confirmed',
                    title: '✅ Your Match Confirmed',
                    message: `Your match has submitted their date confirmation`,
                    metadata: {
                        stake_id: stakeId,
                        confirmer_address: address?.toLowerCase(),
                        outcome: payout?.outcome,
                    }
                })
            });
            console.log('✅ Notification sent');
        } catch (error) {
            console.error('❌ Failed to send notification:', error);
        }
    };

    const updateStakesTable = async () => {
        try {
            console.log('📊 Updating stakes table');
            const { data: stakeData, error: stakeError } = await supabaseClient
                .from('stakes')
                .select('user1_address, user2_address')
                .eq('id', stakeId)
                .single();

            if (stakeError) {
                console.error('❌ Failed to fetch stake data:', stakeError);
                return;
            }

            const isCurrentUserUser1 = address?.toLowerCase() === stakeData.user1_address.toLowerCase();
            const confirmationField = isCurrentUserUser1 ? 'user1_confirmed' : 'user2_confirmed';

            const { error: updateError } = await supabaseClient
                .from('stakes')
                .update({
                    [confirmationField]: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', stakeId);

            if (updateError) {
                console.error('❌ Failed to update stakes table:', updateError);
                return;
            }

            console.log(`✅ Updated ${confirmationField} for stake ${stakeId}`);
        } catch (error) {
            console.error('❌ Failed to update stakes table:', error);
        }
    };

    // ✅ FIXED: Return response data so we can wait for it
    const recordDateInDatabase = async () => {
        try {
            console.log('📝 Recording date in database and blockchain for both users');
            
            const response = await fetch('/api/date/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stakeId,
                    user1Address: address?.toLowerCase(),
                    user2Address: matchAddress.toLowerCase(),
                    meetingTime,
                    bothShowedUp: iShowedUp && partnerShowedUp,
                    user1ShowedUp: iShowedUp,
                    user2ShowedUp: partnerShowedUp
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Date recorded for both users');
                return data;
            } else {
                console.error('❌ Failed to record date:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('❌ Failed to record date:', error);
            return { success: false, error };
        }
    };

    const triggerAchievementMinting = async () => {
        try {
            console.log('🏆 Triggering achievement minting for both users');
            
            // Trigger for current user
            console.log(`🏆 Checking achievements for current user: ${address}`);
            const userResponse = await fetch('/api/achievements/auto-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: address })
            });
            
            const userData = await userResponse.json();
            console.log('🏆 Current user achievements response:', userData);
            
            if (userData.mintedAchievements && userData.mintedAchievements.length > 0) {
                const successfulMints = userData.mintedAchievements.filter(
                    (a: any) => a.status === 'success'
                );
                if (successfulMints.length > 0) {
                    console.log(`🎉 Minted ${successfulMints.length} achievement(s) for current user!`);
                }
            }

            // Trigger for match user
            console.log(`🏆 Checking achievements for match user: ${matchAddress}`);
            const matchResponse = await fetch('/api/achievements/auto-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: matchAddress })
            });
            
            const matchData = await matchResponse.json();
            console.log('🏆 Match user achievements response:', matchData);
            
            if (matchData.mintedAchievements && matchData.mintedAchievements.length > 0) {
                const successfulMints = matchData.mintedAchievements.filter(
                    (a: any) => a.status === 'success'
                );
                if (successfulMints.length > 0) {
                    console.log(`🎉 Minted ${successfulMints.length} achievement(s) for match user!`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to trigger achievement minting:', error);
        }
    };

    if (showRatingPrompt) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
                    <p className="text-5xl mb-4">⭐</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation Recorded!</h3>
                    <p className="text-gray-600 mb-6">
                        Would you like to rate your experience with {matchName}?
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                onClose();
                                onSuccess();
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Skip
                        </button>
                        <button
                            onClick={() => onSuccess()}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                        >
                            Rate Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="text-pink-500" size={28} />
                        Confirm Date
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isPending || isConfirming || isProcessingBlockchain}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* ✅ NEW: Show blockchain processing state */}
                {isSuccess && isProcessingBlockchain ? (
                    <div className="text-center py-6">
                        <Loader2 className="animate-spin h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Processing...</h3>
                        <p className="text-gray-600 mb-2">
                            Recording your date on the blockchain
                        </p>
                        <p className="text-sm text-gray-500">
                            This may take 10-15 seconds
                        </p>
                    </div>
                ) : isSuccess ? (
                    <div className="text-center py-6">
                        <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">All Done!</h3>
                        <p className="text-gray-600 mb-6">
                            Your confirmation has been fully processed.
                        </p>
                    </div>
                ) : isPending || isConfirming ? (
                    <div className="text-center py-6">
                        <Loader2 className="animate-spin h-12 w-12 text-pink-500 mx-auto mb-4" />
                        <p className="text-gray-600">
                            {isPending ? 'Waiting for wallet confirmation...' : 'Confirming on blockchain...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Compassionate Model Info */}
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2 mb-2">
                                <Heart className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-sm text-blue-800 font-semibold">
                                    💙 Compassionate Outcomes
                                </p>
                            </div>
                            <ul className="text-xs text-blue-700 space-y-1.5 ml-7">
                                <li>• <strong>Both show:</strong> Both get 95% refund</li>
                                <li>• <strong>You show, they don't:</strong> You get 142.5%</li>
                                <li>• <strong>They show, you don't:</strong> You get 20% back</li>
                                <li>• <strong>Both honest about not showing:</strong> Both 20%</li>
                            </ul>
                        </div>

                        {/* Meeting Details */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Meeting with:</span>
                                    <span className="font-semibold text-gray-900">{matchName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Scheduled time:</span>
                                    <span className="font-semibold text-gray-900">
                                        {meetingDate.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Stake amount:</span>
                                    <span className="font-semibold text-gray-900">{stakeAmount} USDC</span>
                                </div>
                            </div>
                        </div>

                        {/* Time Warnings */}
                        {isBeforeMeeting && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    ⏰ Meeting hasn't occurred yet. Come back after {meetingDate.toLocaleString()}.
                                </p>
                            </div>
                        )}

                        {isAfterDeadline && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    ⏰ The 48-hour confirmation window has closed.
                                </p>
                            </div>
                        )}

                        {/* QUESTION 1 */}
                        <div className="mb-6">
                            <label className="block text-base font-semibold text-gray-900 mb-3">
                                1. Did YOU personally show up?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIShowedUp(false)}
                                    disabled={!canConfirm}
                                    className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${iShowedUp === false
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                        } disabled:opacity-50`}
                                >
                                    <span className="text-2xl block mb-1">❌</span>
                                    No, I didn't
                                </button>
                                <button
                                    onClick={() => setIShowedUp(true)}
                                    disabled={!canConfirm}
                                    className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${iShowedUp === true
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                        } disabled:opacity-50`}
                                >
                                    <span className="text-2xl block mb-1">✅</span>
                                    Yes, I showed
                                </button>
                            </div>
                        </div>

                        {/* QUESTION 2 */}
                        <div className="mb-6">
                            <label className="block text-base font-semibold text-gray-900 mb-3">
                                2. Did {matchName} show up?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPartnerShowedUp(false)}
                                    disabled={!canConfirm}
                                    className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${partnerShowedUp === false
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                        } disabled:opacity-50`}
                                >
                                    <span className="text-2xl block mb-1">❌</span>
                                    No, they didn't
                                </button>
                                <button
                                    onClick={() => setPartnerShowedUp(true)}
                                    disabled={!canConfirm}
                                    className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${partnerShowedUp === true
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                        } disabled:opacity-50`}
                                >
                                    <span className="text-2xl block mb-1">✅</span>
                                    Yes, they showed
                                </button>
                            </div>
                        </div>

                        {/* Conflict Warning */}
                        {isConflict && (
                            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-semibold text-yellow-800 mb-1">
                                            ⚠️ Potential Conflict
                                        </p>
                                        <p className="text-xs text-yellow-700">
                                            If they also claim they showed, both receive 90% back.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payout Preview */}
                        {payout && (
                            <div className={`mb-4 p-4 rounded-lg border-2 ${payout.color === 'green' ? 'bg-green-50 border-green-200' :
                                payout.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                                    payout.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                                        'bg-gray-50 border-gray-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSign size={20} />
                                    <p className="text-sm font-semibold">{payout.message}</p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>You'll receive:</span>
                                        <span className="font-bold">${payout.you.toFixed(2)} USDC</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{matchName} receives:</span>
                                        <span className="font-semibold">${payout.partner.toFixed(2)} USDC</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                                        <span>Platform fee:</span>
                                        <span>${payout.platform.toFixed(2)} USDC</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleConfirm}
                            disabled={!canConfirm || iShowedUp === null || partnerShowedUp === null}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            Submit Confirmation
                        </button>

                        {/* Info */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 font-semibold mb-2">What happens next:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li>• Your answers recorded on-chain</li>
                                <li>• Date recorded to blockchain</li>
                                <li>• Achievements checked automatically</li>
                                <li>• {matchName} confirms independently</li>
                                <li>• Payouts process automatically</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
