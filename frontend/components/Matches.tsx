'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMatches } from '@/hooks/useMatches';
import { useProfile } from '@/hooks/useProfile';
import ProfileCard from './ProfileCard';
import GiftingModal from './GiftingModal';

export default function Matches() {
    const { address } = useAccount();
    const { matches, loading: matchesLoading } = useMatches(address);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });

   
    useEffect(() => {
        const fetchProfiles = async () => {
            if (matches && matches.length > 0) {
                setLoading(true);
                try {
                    const profilePromises = matches.map(async (matchAddress) => {
                        
                        const response = await fetch(`/api/profile/${matchAddress}`);
                        if (response.ok) {
                            const profile = await response.json();
                            return { ...profile, address: matchAddress };
                        }
                        return { address: matchAddress, name: 'Unknown User', age: 0, interests: '', photoUrl: '' };
                    });

                    const profilesData = await Promise.all(profilePromises);
                    setProfiles(profilesData);
                } catch (error) {
                    console.error('Error fetching profiles:', error);
                    // Fallback to basic data
                    const fallbackProfiles = matches.map(matchAddress => ({
                        address: matchAddress,
                        name: 'User',
                        age: 0,
                        interests: 'Interests not loaded',
                        photoUrl: ''
                    }));
                    setProfiles(fallbackProfiles);
                } finally {
                    setLoading(false);
                }
            } else {
                setProfiles([]);
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [matches]);

    const handleGiftClick = (recipientAddress: string, recipientName: string) => {
        setSelectedRecipient({ address: recipientAddress, name: recipientName });
        setShowGiftingModal(true);
    };

    if (matchesLoading || loading) {
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

            {profiles.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">💔</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No matches yet</h3>
                    <p className="text-gray-500">
                        Express interest in profiles to find your matches!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                        <ProfileCard
                            key={profile.address}
                            profile={profile}
                            onGift={() => handleGiftClick(profile.address, profile.name)}
                        />
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
        </div>
    );
}