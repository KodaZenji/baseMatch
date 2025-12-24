'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import { USDC_ABI, CONTRACTS } from '@/lib/contracts';

// interface PhysicalGift {
//     id: string;
//     name: string;
//     description: string;
//     price: number;
//     image: string;
//     vendor: string;
//     category: 'flowers' | 'teddy' | 'giftbox' | 'food';
//     emoji: string;
// }

// const PHYSICAL_GIFTS: PhysicalGift[] = [
//     {
//         id: 'roses-bouquet',
//         name: 'Red Roses Bouquet',
//         description: 'Dozen premium red roses',
//         price: 49.99,
//         image: '🌹',
//         vendor: '1-800-Flowers',
//         category: 'flowers',
//         emoji: '🌹'
//     },
//     {
//         id: 'mixed-flowers',
//         name: 'Mixed Flower Arrangement',
//         description: 'Beautiful seasonal mix',
//         price: 39.99,
//         image: '💐',
//         vendor: '1-800-Flowers',
//         category: 'flowers',
//         emoji: '💐'
//     },
//     {
//         id: 'teddy-bear',
//         name: 'Plush Teddy Bear',
//         description: 'Large cuddly teddy bear',
//         price: 29.99,
//         image: '🧸',
//         vendor: 'Build-A-Bear',
//         category: 'teddy',
//         emoji: '🧸'
//     },
//     {
//         id: 'teddy-roses',
//         name: 'Teddy with Roses',
//         description: 'Bear holding rose bouquet',
//         price: 59.99,
//         image: '🧸',
//         vendor: '1-800-Flowers',
//         category: 'teddy',
//         emoji: '🧸🌹'
//     },
//     {
//         id: 'chocolate-box',
//         name: 'Luxury Chocolate Box',
//         description: 'Assorted premium chocolates',
//         price: 34.99,
//         image: '🍫',
//         vendor: 'Godiva',
//         category: 'giftbox',
//         emoji: '🍫'
//     },
//     {
//         id: 'gift-basket',
//         name: 'Gourmet Gift Basket',
//         description: 'Wine, cheese & treats',
//         price: 79.99,
//         image: '🎁',
//         vendor: 'Harry & David',
//         category: 'giftbox',
//         emoji: '🎁'
//     },
//     {
//         id: 'spa-box',
//         name: 'Spa Gift Set',
//         description: 'Relaxation essentials',
//         price: 44.99,
//         image: '🧖',
//         vendor: 'Sephora',
//         category: 'giftbox',
//         emoji: '🧖‍♀️'
//     },
//     {
//         id: 'dinner-delivery',
//         name: 'Restaurant Dinner',
//         description: 'Fine dining delivered',
//         price: 75.00,
//         image: '🍽️',
//         vendor: 'DoorDash',
//         category: 'food',
//         emoji: '🍽️'
//     },
//     {
//         id: 'dessert-box',
//         name: 'Dessert Sampler',
//         description: 'Cupcakes & pastries',
//         price: 32.99,
//         image: '🧁',
//         vendor: 'Uber Eats',
//         category: 'food',
//         emoji: '🧁'
//     }
// ];

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
    const [giftType, setGiftType] = useState<'crypto' | 'physical'>('crypto');
    const [cryptoType, setCryptoType] = useState<'usdc' | 'eth'>('usdc');
    const [selectedPhysicalGift, setSelectedPhysicalGift] = useState<any | null>(null);
    const [deliveryInfo, setDeliveryInfo] = useState({
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        notes: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [showDeliveryForm, setShowDeliveryForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState<any>('all'); // Using 'any' to avoid type error since the union type is not available
    const { writeContract: writeUSDC, data: usdcHash } = useWriteContract();
    const { writeContract: sendETH, data: ethHash } = useWriteContract();
    const { isLoading: isUSDCConfirming, isSuccess: isUSDCTransferred } = useWaitForTransactionReceipt({ hash: usdcHash });
    const { isLoading: isETHConfirming, isSuccess: isETHTransferred } = useWaitForTransactionReceipt({ hash: ethHash });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    // Create notification after successful crypto gift send
    const createCryptoGiftNotification = async (txHash: string) => {
        try {
            await fetch('/api/notifications/gift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientAddress,
                    senderAddress: address,
                    senderName: 'Your Match', // 
                    giftType: 'crypto',
                    cryptoType,
                    giftAmount,
                    txHash,
                }),
            });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    };

    const handleCryptoGiftSend = async () => {
        if (!giftAmount || parseFloat(giftAmount) <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }

        setIsProcessing(true);

        try {
            if (cryptoType === 'usdc') {
                const amount = parseUnits(giftAmount, 6);
                writeUSDC({
                    address: CONTRACTS.USDC as `0x${string}`,
                    abi: USDC_ABI,
                    functionName: 'transfer',
                    args: [recipientAddress as `0x${string}`, amount],
                });
            } else {
                const amount = parseEther(giftAmount);
                sendETH({
                    to: recipientAddress as `0x${string}`,
                    value: amount,
                } as any);
            }
        } catch (error) {
            console.error('Error sending gift:', error);
            showNotification('Failed to send gift', 'error');
            setIsProcessing(false);
        }
    };

    // Physical gifting functions are disabled - commented out for future implementation
    // const handlePhysicalGiftSelect = (gift: PhysicalGift) => {
    //     setSelectedPhysicalGift(gift);
    //     setShowDeliveryForm(true);
    // };

    // const handlePhysicalGiftPurchase = async () => {
    //     if (!selectedPhysicalGift) return;

    //     if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.state || !deliveryInfo.zip || !deliveryInfo.phone) {
    //         showNotification('Please fill in all delivery details', 'error');
    //         return;
    //     }

    //     setIsProcessing(true);

    //     try {
    //         const amount = parseUnits(selectedPhysicalGift.price.toString(), 6);
    //         const platformWallet = CONTRACTS.PLATFORM_WALLET || CONTRACTS.MATCHING;

    //         writeUSDC({
    //             address: CONTRACTS.USDC as `0x${string}`,
    //             abi: USDC_ABI,
    //             functionName: 'transfer',
    //             args: [platformWallet as `0x${string}`, amount],
    //         });

    //     } catch (error) {
    //         console.error('Error purchasing physical gift:', error);
    //         showNotification('Failed to purchase gift', 'error');
    //         setIsProcessing(false);
    //     }
    // };

    // Handle successful transfers
    useEffect(() => {
        if (isUSDCTransferred || isETHTransferred) {
            const txHash = (usdcHash || ethHash) as string;

            if (giftType === 'crypto') {
                // Create notification for crypto gift
                createCryptoGiftNotification(txHash);
                showNotification(`Successfully sent ${giftAmount} ${cryptoType.toUpperCase()} to ${recipientName}!`, 'success');
            }

            setIsProcessing(false);
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [isUSDCTransferred, isETHTransferred]);

    // const filteredGifts = filterCategory === 'all' 
    //     ? PHYSICAL_GIFTS 
    //     : PHYSICAL_GIFTS.filter(g => g.category === filterCategory);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full my-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">🎁 Gift to {recipientName}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
                </div>

                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setGiftType('crypto'); setShowDeliveryForm(false); }}
                            className={`py-4 px-6 rounded-xl border-2 transition ${giftType === 'crypto' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                            <div className="text-3xl mb-1">🪙</div>
                            <div className="font-semibold">Crypto Gift</div>
                            <div className="text-xs text-gray-500">Instant transfer</div>
                        </button>
                        <button
                            disabled
                            className="py-4 px-6 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                        >
                            <div className="text-3xl mb-1">📦</div>
                            <div className="font-semibold">IRL Gifting</div>
                            <div className="text-xs text-gray-500">Coming Soon</div>
                        </button>
                    </div>
                </div>
                {giftType === 'crypto' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setCryptoType('usdc')} className={`py-3 px-4 rounded-xl border ${cryptoType === 'usdc' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                                    <div className="font-medium">USDC</div>
                                    <div className="text-xs text-gray-500">Stablecoin</div>
                                </button>
                                <button onClick={() => setCryptoType('eth')} className={`py-3 px-4 rounded-xl border ${cryptoType === 'eth' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                                    <div className="font-medium">ETH</div>
                                    <div className="text-xs text-gray-500">Native Token</div>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={giftAmount}
                                    onChange={(e) => setGiftAmount(e.target.value)}
                                    className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-gray-500 font-medium">{cryptoType.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {giftType === 'physical' && (
                    <div className="space-y-4">
                        <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 text-center">
                            <div className="text-4xl mb-3">📦</div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">IRL Gifting Coming Soon!</h3>
                            <p className="text-gray-600">Physical gift delivery is not yet available. Send crypto gifts instantly instead!</p>
                        </div>
                    </div>
                )}
                <div className="flex space-x-3 pt-6 border-t mt-6">
                    <button onClick={onClose} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={giftType === 'crypto' ? handleCryptoGiftSend : undefined}
                        disabled={isProcessing || isUSDCConfirming || isETHConfirming || (giftType === 'crypto' && (!giftAmount || parseFloat(giftAmount) <= 0))}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {isProcessing || isUSDCConfirming || isETHConfirming ? 'Processing...' : giftType === 'crypto' ? 'Send Gift' : 'Coming Soon'}
                    </button>
                </div>
            </div>
        </div>
    );
}
