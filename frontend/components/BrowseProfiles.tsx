'use client';

import { useAccount, useWriteContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS } from '@/lib/contracts';
import ProfileCard from './ProfileCard';
import { useProfiles } from '@/hooks/useProfiles';
import { useState, useEffect } from 'react';
import GiftingModal from './GiftingModal';
import { RefreshCw } from 'lucide-react'; // Add this import

export default function BrowseProfiles() {
    const { address } = useAccount();
    const { profiles, loading, refresh } = useProfiles(); // ✅ Get refresh function
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isTestMode, setIsTestMode] = useState(true);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [isExpressingInterest, setIsExpressingInterest] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // ✅ Track manual refresh state

    const { writeContract, isPending, isError, error } = useWriteContract();

    // Check if we're using real contract addresses
    useEffect(() => {
        const hasValidContracts = CONTRACTS.MATCHING &&
            CONTRACTS.MATCHING.startsWith('0x') &&
            CONTRACTS.MATCHING.length === 42;
        setIsTestMode(!hasValidContracts);
    }, []);

    // ✅ Manual refresh handler
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleExpressInterest = async (targetAddress: string) => {
        if (!address) {
            setSuccessMessage('Please connect your wallet first.');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            return;
        }

        if (isExpressingInterest) {
            return; // Prevent double-clicking
        }

        setIsExpressingInterest(true);

        try {
            // Call our API to record interest and check for match
            const response = await fetch('/api/match/express-interest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAddress: address,
                    toAddress: targetAddress
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to express interest');
            }

            const profileName = profiles.find(p => p.wallet_address === targetAddress)?.name || 'user';

            if (data.matched) {
                // It's a match!
                setSuccessMessage(`🎉 It's a match with ${profileName}! Check your notifications.`);
            } else {
                // Interest recorded
                setSuccessMessage(`❤️ Interest sent to ${profileName}!`);
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);

            // If not in test mode, also call the smart contract
            if (!isTestMode && CONTRACTS.MATCHING) {
                try {
                    writeContract({
                        address: CONTRACTS.MATCHING as `0x${string}`,
                        abi: MATCHING_ABI,
                        functionName: 'expressInterest',
                        args: [targetAddress as `0x${string}`],
                    });
                } catch (contractError) {
                    console.warn('Smart contract call failed, but API call succeeded:', contractError);
                }
            }
        } catch (error) {
            console.error('Error expressing interest:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setSuccessMessage(`Failed to express interest: ${errorMsg}`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
        } finally {
            setIsExpressingInterest(false);
        }
    };

    const handleGift = (recipientAddress: string, recipientName: string) => {
        setSelectedRecipient({ address: recipientAddress, name: recipientName });
        setShowGiftingModal(true);
    };

    useEffect(() => {
        if (isError && error) {
            let userFriendlyMessage = 'Unable to express interest. ';

            if (error.message?.includes('profile does not exist')) {
                userFriendlyMessage += 'Please ensure both users have minted their profiles.';
            } else if (error.message?.includes('Already expressed interest')) {
                userFriendlyMessage += 'You already liked this person.';
            } else if (error.message?.includes('Already matched')) {
                userFriendlyMessage += 'You are already matched with this person.';
            } else if (error.message?.includes('Cannot express interest in yourself')) {
                userFriendlyMessage += 'You cannot express interest in yourself.';
            } else {
                userFriendlyMessage += 'Please try again or contact support if the issue persists.';
            }

            setSuccessMessage(userFriendlyMessage);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        }
    }, [isError, error]);

    if (loading && profiles.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading profiles...</div>
            </div>
        );
    }

    // Filter out the current user's profile from the discovery page
    const filteredProfiles = profiles.filter(profile => profile.wallet_address.toLowerCase() !== address?.toLowerCase());

    return (
        <div>
            {/* Header with title and refresh button */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Discover People</h2>
                
                {/* ✅ Manual Refresh Button */}
                <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    title="Refresh profiles"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Test mode indicator */}
            {isTestMode && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                    Test Mode: Using mock profiles. Express interest functionality will create notifications.
                </div>
            )}

            {/* Success/error message */}
            {showSuccess && (
                <div className={`mb-4 p-3 rounded-lg ${successMessage.includes('Failed') || successMessage.includes('error')
                        ? 'bg-red-100 text-red-700'
                        : successMessage.includes('match')
                            ? 'bg-green-100 text-green-700 font-semibold text-lg'
                            : 'bg-blue-100 text-blue-700'
                    }`}>
                    {successMessage}
                </div>
            )}

            {/* ✅ Loading overlay during refresh */}
            <div className="relative">
                {loading && profiles.length > 0 && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                        <div className="text-blue-600 font-semibold">Refreshing...</div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProfiles.map((profile) => (
                        <ProfileCard
                            key={profile.wallet_address}
                            profile={profile}
                            onExpressInterest={handleExpressInterest}
                            onGift={() => handleGift(profile.wallet_address, profile.name)}
                            isPending={isPending || isExpressingInterest}
                        />
                    ))}
                </div>
            </div>

            {filteredProfiles.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No profiles to show yet</p>
                    <p className="text-gray-400">Check back later or invite your friends!</p>
                </div>
            )}

            {/* Gifting Modal */}
            <GiftingModal
                isOpen={showGiftingModal}
                onClose={() => setShowGiftingModal(false)}
                recipientAddress={selectedRecipient.address}
                recipientName={selectedRecipient.name}
            />
        </div>
    );
}
