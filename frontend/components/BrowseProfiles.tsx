'use client';

import { useAccount, useWriteContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS } from '@/lib/contracts';
import ProfileCard from './ProfileCard';
import { useProfiles } from '@/hooks/useProfiles';
import { useState, useEffect } from 'react';
import GiftingModal from './GiftingModal';

export default function BrowseProfiles() {
    const { address } = useAccount();
    const { profiles, loading } = useProfiles();
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isTestMode, setIsTestMode] = useState(true);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });

    const { writeContract, isPending, isError, error } = useWriteContract();

    // Check if we're using real contract addresses
    useEffect(() => {
        const hasValidContracts = CONTRACTS.MATCHING &&
            CONTRACTS.MATCHING.startsWith('0x') &&
            CONTRACTS.MATCHING.length === 42;
        setIsTestMode(!hasValidContracts);
    }, []);

    const handleExpressInterest = async (targetAddress: string) => {
        // For test mode with mock profiles, just show a success message
        if (isTestMode) {
            console.log('Expressing interest in mock profile:', targetAddress);

            // Show success message
            const profileName = profiles.find(p => p.wallet_address === targetAddress)?.name || 'user';
            setSuccessMessage(`Interest expressed in ${profileName}! (Test mode - no blockchain interaction)`);
            setShowSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
            return;
        }

        // For real mode, call the smart contract
        try {
            // Validate wallet connection
            if (!address) {
                setSuccessMessage('Please connect your wallet first.');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
                return;
            }

            // Validate contract address
            if (!CONTRACTS.MATCHING || !CONTRACTS.MATCHING.startsWith('0x')) {
                console.error('❌ CONTRACTS object:', CONTRACTS);
                console.error('❌ MATCHING address:', CONTRACTS.MATCHING);
                setSuccessMessage('Matching contract not configured. Ensure .env.local has NEXT_PUBLIC_MATCHING_ADDRESS and dev server is restarted.');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 5000);
                return;
            }

            // Log transaction details
            console.log('📤 Sending expressInterest transaction:', {
                contract: CONTRACTS.MATCHING,
                from: address,
                to: targetAddress
            });

            writeContract({
                address: CONTRACTS.MATCHING as `0x${string}`,
                abi: MATCHING_ABI,
                functionName: 'expressInterest',
                args: [targetAddress as `0x${string}`],
            });

            // Show success message
            const profileName = profiles.find(p => p.wallet_address === targetAddress)?.name || 'user';
            setSuccessMessage(`Interest expressed in ${profileName}! Check your wallet for the transaction.`);
            setShowSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('❌ Error expressing interest:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error details:', errorMsg);

            setSuccessMessage('Unable to send transaction. Please check your wallet and try again.');
            setShowSuccess(true);

            // Hide error message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
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

            // Hide error message after 5 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 5000);
        }
    }, [isError, error]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading profiles...</div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Discover People</h2>

            {/* Test mode indicator */}
            {isTestMode && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                    Test Mode: Using mock profiles. Express interest functionality is simulated.
                </div>
            )}

            {/* Success/error message */}
            {showSuccess && (
                <div className={`mb-4 p-3 rounded-lg ${successMessage.includes('Failed') || successMessage.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.wallet_address}
                        profile={profile}
                        onExpressInterest={handleExpressInterest}
                        onGift={() => handleGift(profile.wallet_address, profile.name)}
                        isPending={isPending}
                    />
                ))}
            </div>

            {profiles.length === 0 && (
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
