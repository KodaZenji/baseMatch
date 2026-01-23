'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useMatches } from '@/hooks/useMatches';
import ProfileCard from './ProfileCard';
import GiftingModal from './GiftingModal';
import ChatWindow from './ChatWindow';
import { Trash2, AlertCircle, Heart, Users } from 'lucide-react';
import { CONTRACTS, MATCHING_ABI } from '@/lib/contracts';

export default function Matches() {
    const { address } = useAccount();
    const { writeContract } = useWriteContract();
    const { matches, loading: matchesLoading } = useMatches(address);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [showChatWindow, setShowChatWindow] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [selectedChatMatch, setSelectedChatMatch] = useState<{ address: string; name: string } | null>(null);
    const [removingMatch, setRemovingMatch] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState<{ address: string; name: string } | null>(null);

    // DEBUG: Log match data
    useEffect(() => {
        console.log('=== MATCHES DEBUG ===');
        console.log('Your address:', address);
        console.log('Matches loading:', matchesLoading);
        console.log('Number of matches:', matches?.length);
        console.log('Match data:', matches);

        if (matches && matches.length > 0) {
            matches.forEach((match, i) => {
                console.log(`Match ${i}:`, {
                    address: match.address,
                    name: match.name,
                    age: match.age,
                    interests: match.interests
                });
            });
        }
    }, [matches, matchesLoading, address]);

    const handleGiftClick = (recipientAddress: string, recipientName: string) => {
        setSelectedRecipient({ address: recipientAddress, name: recipientName });
        setShowGiftingModal(true);
    };

    const handleChatClick = (matchAddress: string, matchName: string) => {
        setSelectedChatMatch({ address: matchAddress, name: matchName });
        setShowChatWindow(true);
    };

    const handleRemoveMatch = (matchAddress: string, matchName: string) => {
        if (!address) return;
        
        // Show custom confirm modal instead of native confirm
        setMatchToDelete({ address: matchAddress, name: matchName });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!address || !matchToDelete) return;

        setShowDeleteConfirm(false);
        setRemovingMatch(matchToDelete.address);
        
        try {
            // Step 1: Delete from database
            const response = await fetch('/api/profile/remove-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-address': address.toLowerCase(),
                },
                body: JSON.stringify({
                    matchedUserAddress: matchToDelete.address.toLowerCase(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to remove match from database');
            }

            const data = await response.json();
            console.log('Match removed from database:', data);

            // Step 2: Call blockchain to remove match
            if (data.blockchainRemovalRequired && CONTRACTS.MATCHING) {
                try {
                    writeContract({
                        address: CONTRACTS.MATCHING as `0x${string}`,
                        abi: MATCHING_ABI,
                        functionName: 'removeMatch',
                        args: [matchToDelete.address.toLowerCase() as `0x${string}`],
                    });
                    console.log('Blockchain removeMatch transaction sent');
                } catch (blockchainError) {
                    console.error('Blockchain removal error:', blockchainError);
                    alert('Database deletion succeeded but blockchain update failed. Please try again.');
                    return;
                }
            }

            // Refetch matches to update the UI
            window.location.reload();
        } catch (error) {
            console.error('Error removing match:', error);
            alert('Failed to remove match. Please try again.');
        } finally {
            setRemovingMatch(null);
            setMatchToDelete(null);
        }
    };

    if (matchesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading matches...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Heart className="text-pink-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">Your Matches</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    <Users size={16} />
                    {matches?.length || 0} matches
                </div>
            </div>


            {/* Warning for Unknown Users */}
            {matches && matches.some(m => m.name === 'Unknown User' || m.name === 'User') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <div className="font-semibold text-yellow-900">Some profiles couldn't be loaded</div>
                        <div className="text-sm text-yellow-800 mt-1">
                            This happens when the API fails to fetch profile data from the blockchain.
                            Check the browser console for error messages.
                        </div>
                    </div>
                </div>
            )}

            {!matches || matches.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                    <Heart className="w-24 h-24 text-gray-300 mx-auto" />
                    <h3 className="text-xl font-medium text-gray-900">No matches yet</h3>
                    <p className="text-gray-500">
                        Express interest in profiles to find your matches!
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                        Your address: {address || 'Not connected'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map((match) => (
                        <div key={match.address} className="relative">
                            <ProfileCard
    profile={{
        wallet_address: match.address,
        name: match.name,
        birthYear: match.birthYear,  
        gender: match.gender,
        interests: match.interests,
        photo_url: match.photoUrl,
        photoUrl: match.photoUrl,
    }}
    onGift={() => handleGiftClick(match.address, match.name)}
/>
                            <div className="absolute top-4 right-4 flex gap-2 z-10">
                                <button
                                    onClick={() => handleChatClick(match.address, match.name)}
                                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 text-sm"
                                >
                                    Chat
                                </button>
                                <button
                                    onClick={() => handleRemoveMatch(match.address, match.name)}
                                    disabled={removingMatch === match.address}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                                    title="Remove match"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Gifting Modal */}
            <GiftingModal
                isOpen={showGiftingModal}
                onClose={() => setShowGiftingModal(false)}
                recipientAddress={selectedRecipient.address}
                recipientName={selectedRecipient.name}
            />

            {/* Chat Window */}
            {showChatWindow && address && selectedChatMatch && (
                <ChatWindow
                    user1Address={address}
                    user2Address={selectedChatMatch.address}
                    user1Name="You"
                    user2Name={selectedChatMatch.name}
                    currentUserAddress={address}
                    onClose={() => setShowChatWindow(false)}
                />
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && matchToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Remove Match?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to remove <span className="font-semibold">{matchToDelete.name}</span> from your matches? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setMatchToDelete(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:opacity-90"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:opacity-90"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
