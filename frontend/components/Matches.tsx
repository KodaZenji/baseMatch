'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMatches } from '@/hooks/useMatches';
import ProfileCard from './ProfileCard';
import GiftingModal from './GiftingModal';
import ChatWindow from './ChatWindow';
import { Trash2, AlertCircle, Heart, Users } from 'lucide-react';

export default function Matches() {
    const { address } = useAccount();
    const { matches, loading: matchesLoading } = useMatches(address);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [showChatWindow, setShowChatWindow] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [selectedChatMatch, setSelectedChatMatch] = useState<{ address: string; name: string } | null>(null);
    const [removingMatch, setRemovingMatch] = useState<string | null>(null);

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

    const handleRemoveMatch = async (matchAddress: string) => {
        if (!address) return;
        if (!confirm('Are you sure you want to remove this match?')) return;

        setRemovingMatch(matchAddress);
        try {
            const response = await fetch('/api/profile/remove-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-address': address.toLowerCase(),
                },
                body: JSON.stringify({
                    matchedUserAddress: matchAddress.toLowerCase(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to remove match');
            }

            // Refetch matches to update the UI
            window.location.reload();
        } catch (error) {
            console.error('Error removing match:', error);
            alert('Failed to remove match. Please try again.');
        } finally {
            setRemovingMatch(null);
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
                <h2 className="text-2xl font-bold text-gray-900">Your Matches</h2>
                <div className="text-sm text-gray-500">
                    {matches?.length || 0} matches
                </div>
            </div>


            {/* Warning for Unknown Users */}
            {matches && matches.some(m => m.name === 'Unknown User' || m.name === 'User') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="font-semibold text-yellow-900">⚠️ Some profiles couldn't be loaded</div>
                    <div className="text-sm text-yellow-800 mt-1">
                        This happens when the API fails to fetch profile data from the blockchain.
                        Check the browser console for error messages.
                    </div>
                </div>
            )}

            {!matches || matches.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">💔</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No matches yet</h3>
                    <p className="text-gray-500">
                        Express interest in profiles to find your matches!
                    </p>
                    <p className="text-xs text-gray-400 mt-2 font-mono">
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
                                    age: match.age,
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
                                    onClick={() => handleRemoveMatch(match.address)}
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
        </div>
    );
}
