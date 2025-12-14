'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';

interface DateConfirmationModalProps {
    stakeId: string;
    matchAddress: string;
    matchName: string;
    meetingTime: number;
    stakeAmount: string;
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * FIX 3: Date Confirmation Modal
 * 
 * This modal appears AFTER the scheduled meeting time has passed.
 * Both parties must independently confirm whether the date occurred.
 * 
 * Anti-fraud measures:
 * 1. Confirmation only enabled after meeting time
 * 2. Time-limited confirmation window (e.g., 48 hours)
 * 3. Both parties confirm independently - no coordination
 * 4. Clear UI showing consequences
 * 5. Blockchain records prevent manipulation
 */
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
    const [confirmAttendance, setConfirmAttendance] = useState<boolean | null>(null);
    const [error, setError] = useState('');
    const [showRatingPrompt, setShowRatingPrompt] = useState(false);

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if confirmation window is still open (48 hours after meeting)
    const meetingDate = new Date(meetingTime * 1000);
    const confirmationDeadline = new Date(meetingTime * 1000 + 48 * 60 * 60 * 1000);
    const isBeforeMeeting = Date.now() < meetingTime * 1000;
    const isAfterDeadline = Date.now() > confirmationDeadline.getTime();
    const canConfirm = !isBeforeMeeting && !isAfterDeadline;

    const handleConfirm = async (attended: boolean) => {
        if (!canConfirm) {
            setError('Confirmation window is not open yet or has closed');
            return;
        }

        setConfirmAttendance(attended);
        setError('');

        try {
            console.log('📤 Confirming date attendance:', {
                stakeId,
                attended,
                confirmer: address,
            });

            // Call smart contract to confirm
            writeContract({
                address: CONTRACTS.STAKING as `0x${string}`,
                abi: STAKING_ABI,
                functionName: 'confirmMeeting',
                args: [BigInt(stakeId), attended],
            });
        } catch (err) {
            console.error('Confirmation error:', err);
            setError('Failed to confirm attendance. Please try again.');
        }
    };

    // Handle successful confirmation
    useEffect(() => {
        if (isSuccess) {
            // Send notification to other party
            sendConfirmationNotification();

            // If user confirmed they attended, show rating prompt
            if (confirmAttendance === true) {
                setShowRatingPrompt(true);
            } else {
                // Otherwise just close after a delay
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        }
    }, [isSuccess, confirmAttendance]);

    const sendConfirmationNotification = async () => {
        try {
            await fetch('/api/notifications/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: matchAddress.toLowerCase(),
                    type: 'date_confirmed',
                    title: '✅ Date Confirmation',
                    message: `Your match has confirmed ${confirmAttendance ? 'they attended' : 'they did not attend'} the date`,
                    metadata: {
                        stake_id: stakeId,
                        confirmer_address: address?.toLowerCase(),
                        attended: confirmAttendance,
                    }
                })
            });
        } catch (error) {
            console.error('Failed to send confirmation notification:', error);
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
                            onClick={() => {
                                // This will trigger the RatingModal to open
                                onSuccess();
                            }}
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
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">✅ Confirm Date</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                        disabled={isPending || isConfirming}
                    >
                        ✕
                    </button>
                </div>

                {isSuccess ? (
                    <div className="text-center py-6">
                        <p className="text-5xl mb-4">✅</p>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation Recorded!</h3>
                        <p className="text-gray-600 mb-6">
                            Your confirmation has been recorded on the blockchain. {matchName} will be notified.
                        </p>
                    </div>
                ) : isPending || isConfirming ? (
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
                        <p className="text-gray-600">Confirming on blockchain...</p>
                    </div>
                ) : (
                    <>
                        {/* Meeting Details */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Meeting with:</span>
                                <span className="font-semibold text-gray-900">{matchName}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Scheduled time:</span>
                                <span className="font-semibold text-gray-900">
                                    {meetingDate.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Stake amount:</span>
                                <span className="font-semibold text-gray-900">{stakeAmount} USDC</span>
                            </div>
                        </div>

                        {/* Anti-fraud warning */}
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 font-semibold mb-2">⚠️ Important:</p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                                <li>• Both parties confirm independently</li>
                                <li>• Confirmations are recorded on blockchain</li>
                                <li>• False claims are detectable and may affect reputation</li>
                                <li>• You have 48 hours after the meeting to confirm</li>
                            </ul>
                        </div>

                        {/* Time status warnings */}
                        {isBeforeMeeting && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    ⏰ This meeting hasn't occurred yet. You can confirm after {meetingDate.toLocaleString()}.
                                </p>
                            </div>
                        )}

                        {isAfterDeadline && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    ⏰ The 48-hour confirmation window has closed. Stakes have been automatically processed.
                                </p>
                            </div>
                        )}

                        {/* Question */}
                        <div className="mb-6">
                            <p className="text-center text-lg font-semibold text-gray-900 mb-4">
                                Did this date actually occur?
                            </p>
                            <p className="text-center text-sm text-gray-600 mb-4">
                                Please answer honestly. Your response is recorded on the blockchain.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Confirmation Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleConfirm(false)}
                                disabled={!canConfirm || isPending || isConfirming}
                                className="px-4 py-3 border-2 border-red-300 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="text-2xl block mb-1">😞</span>
                                No, didn't happen
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                disabled={!canConfirm || isPending || isConfirming}
                                className="px-4 py-3 border-2 border-green-300 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="text-2xl block mb-1">✅</span>
                                Yes, it happened
                            </button>
                        </div>

                        {/* Outcome explanation */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 font-semibold mb-2">What happens next:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li>• <strong>Both confirm:</strong> Both get stakes back (minus 5% fee)</li>
                                <li>• <strong>Only you confirm:</strong> You get 150% of your stake (minus fee)</li>
                                <li>• <strong>Neither confirms:</strong> Both get 90% refund after 48h</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
