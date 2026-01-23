'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import ProfileCard from './ProfileCard';
import GiftingModal from './GiftingModal';
import { Trash2, AlertCircle, Heart, Users } from 'lucide-react';
import { CONTRACTS, MATCHING_ABI } from '@/lib/contracts';

export default function Matches() {
    const { address } = useAccount();
    const { writeContract } = useWriteContract();

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [removingMatch, setRemovingMatch] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState<{ address: string; name: string } | null>(null);

    // Fetch matches from blockchain + profile API
    useEffect(() => {
        if (!address) return;

        const fetchMatches = async () => {
            try {
                setLoading(true);

                // 1️⃣ Fetch match addresses from blockchain
                const response = await fetch(`/api/matches/${address}`);
                const matchAddresses: string[] = await response.json(); // assume array of addresses

                // 2️⃣ Fetch profile data for each match
                const profilePromises = matchAddresses.map(async (addr) => {
                    try {
                        const res = await fetch(`/api/profile/${addr}`);
                        if (!res.ok) throw new Error('Profile fetch failed');
                        const profileData = await res.json();

                        return {
                            address: addr,
                            name: profileData.name || 'Unknown User',
                            birthYear: Number(profileData.birthYear), // ✅ convert to number
                            gender: profileData.gender || '',
                            interests: profileData.interests || '',
                            photoUrl: profileData.photoUrl || '',
                            matchedAt: Date.now(),
                        };
                    } catch (err) {
                        console.warn(`Failed to fetch profile ${addr}:`, err);
                        return {
                            address: addr,
                            name: 'User',
                            birthYear: 0, // fallback birthYear
                            gender: '',
                            interests: 'Interests not loaded',
                            photoUrl: '',
                            matchedAt: Date.now(),
                        };
                    }
                });

                const matchProfiles = await Promise.all(profilePromises);
                setMatches(matchProfiles);
            } catch (error) {
                console.error('Error fetching matches:', error);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [address]);

    const handleGiftClick = (recipientAddress: string, recipientName: string) => {
        setSelectedRecipient({ address: recipientAddress, name: recipientName });
        setShowGiftingModal(true);
    };

    const handleRemoveMatch = (matchAddress: string, matchName: string) => {
        setMatchToDelete({ address: matchAddress, name: matchName });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!address || !matchToDelete) return;

        setShowDeleteConfirm(false);
        setRemovingMatch(matchToDelete.address);

        try {
            const response = await fetch('/api/profile/remove-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-address': address.toLowerCase() },
                body: JSON.stringify({ matchedUserAddress: matchToDelete.address.toLowerCase() }),
            });

            if (!response.ok) throw new Error('Failed to remove match');

            const data = await response.json();

            if (data.blockchainRemovalRequired && CONTRACTS.MATCHING) {
                try {
                    await writeContract({
                        address: CONTRACTS.MATCHING as `0x${string}`,
                        abi: MATCHING_ABI,
                        functionName: 'removeMatch',
                        args: [matchToDelete.address.toLowerCase() as `0x${string}`],
                    });
                } catch (err) {
                    console.error('Blockchain removal failed:', err);
                }
            }

            // Remove locally
            setMatches((prev) => prev.filter((m) => m.address !== matchToDelete.address));
        } catch (err) {
            console.error(err);
        } finally {
            setRemovingMatch(null);
            setMatchToDelete(null);
        }
    };

    if (loading) {
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
                    {matches.length} matches
                </div>
            </div>

            {!matches || matches.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                    <Heart className="w-24 h-24 text-gray-300 mx-auto" />
                    <h3 className="text-xl font-medium text-gray-900">No matches yet</h3>
                    <p className="text-gray-500">Express interest in profiles to find your matches!</p>
                    <p className="text-xs text-gray-400 font-mono">Your address: {address || 'Not connected'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map((match) => (
                        <ProfileCard
                            key={match.address}
                            profile={match}
                            onGift={() => handleGiftClick(match.address, match.name)}
                        />
                    ))}
                </div>
            )}

            <GiftingModal
                isOpen={showGiftingModal}
                onClose={() => setShowGiftingModal(false)}
                recipientAddress={selectedRecipient.address}
                recipientName={selectedRecipient.name}
            />

            {showDeleteConfirm && matchToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Remove Match?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to remove <span className="font-semibold">{matchToDelete.name}</span>? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
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
