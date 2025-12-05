'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMatches } from '@/hooks/useMatches';
import ProfileCard from './ProfileCard';
import GiftingModal from './GiftingModal';
import ChatWindow from './ChatWindow';

export default function Matches() {
    const { address } = useAccount();
    const { matches, loading: matchesLoading } = useMatches(address);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [showChatWindow, setShowChatWindow] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [selectedChatMatch, setSelectedChatMatch] = useState<{ address: string; name: string } | null>(null);

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

            {/* DEBUG INFO - Remove in production */}
            {matches && matches.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <div className="font-semibold text-blue-900 mb-2">🔍 Debug Info:</div>
                    <div className="space-y-1 text-blue-800 font-mono text-xs">
                        {matches.map((match, i) => (
                            <div key={i} className="border-b border-blue-200 pb-1">
                                <div>Match {i + 1}: {match.address}</div>
                                <div className="ml-4">Name: "{match.name}"</div>
                                <div className="ml-4">Age: {match.age}</div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={async () => {
                            if (matches[0]) {
                                const testUrl = `/api/profile/${matches[0].address}`;
                                console.log('Testing API call:', testUrl);
                                const response = await fetch(testUrl);
                                const data = await response.json();
                                console.log('API Response:', data);
                                alert(JSON.stringify(data, null, 2));
                            }
                        }}
                        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
                    >
                        Test API for First Match
                    </button>
                </div>
            )}

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
                            <button
                                onClick={() => handleChatClick(match.address, match.name)}
                                className="absolute top-4 right-14 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-2 rounded-lg font-semibold hover:opacity-90 text-sm z-10"
                            >
                                Chat
                            </button>
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
