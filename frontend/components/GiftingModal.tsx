'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { USDC_ABI, CONTRACTS } from '@/lib/contracts';

export default function GiftingModal({
    isOpen,
    onClose,
    recipientAddress,
    recipientName
}: {
    isOpen: boolean;
    onClose: () => void;
    recipientAddress: string;
    recipientName: string;
}) {
    const { address } = useAccount();
    const [giftAmount, setGiftAmount] = useState('');
    const [giftType, setGiftType] = useState('usdc');
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const { writeContract: writeUSDC, data: usdcHash } = useWriteContract();
    const { isLoading: isUSDCConfirming, isSuccess: isUSDCTransferred } = useWaitForTransactionReceipt({ hash: usdcHash });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const handleGiftSend = async () => {
        if (!giftAmount || parseFloat(giftAmount) <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }

        setIsProcessing(true);

        try {
            if (giftType === 'usdc') {
                // Transfer USDC tokens
                const amount = parseUnits(giftAmount, 6); // USDC has 6 decimals

                writeUSDC({
                    address: CONTRACTS.USDC as `0x${string}`,
                    abi: USDC_ABI,
                    functionName: 'transfer',
                    args: [recipientAddress as `0x${string}`, amount],
                });
            } else {
                // For ETH, you would use sendTransaction from useSendTransaction hook
                showNotification('ETH gifting not implemented yet', 'error');
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('Error sending gift:', error);
            showNotification('Failed to send gift', 'error');
            setIsProcessing(false);
        }
    };

    // Handle successful transfer
    if (isUSDCTransferred) {
        showNotification(`Successfully sent ${giftAmount} USDC to ${recipientName}!`, 'success');
        setIsProcessing(false);
        setTimeout(() => {
            onClose();
        }, 2000);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Gift to {recipientName}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gift Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setGiftType('usdc')}
                                className={`py-3 px-4 rounded-xl border ${giftType === 'usdc'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium">USDC</div>
                                <div className="text-xs text-gray-500">Stablecoin</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setGiftType('eth')}
                                className={`py-3 px-4 rounded-xl border ${giftType === 'eth'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium">ETH</div>
                                <div className="text-xs text-gray-500">Native Token</div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={giftAmount}
                                onChange={(e) => setGiftAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-500">
                                    {giftType === 'usdc' ? 'USDC' : 'ETH'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                        <div className="text-sm text-gray-600">
                            This gift will be sent directly to {recipientName}'s wallet.
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGiftSend}
                            disabled={isProcessing || isUSDCConfirming}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                        >
                            {isProcessing || isUSDCConfirming ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </span>
                            ) : (
                                'Send Gift'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}