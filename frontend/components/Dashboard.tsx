'use client';

import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';
import { useReputation } from '@/hooks/useReputation';
import { generateAvatar } from '@/lib/avatarUtils';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
    const { address } = useAccount();
    const { profile } = useProfile(address);
    const { reputation, loading: reputationLoading } = useReputation(address);
    const [avatarUrl, setAvatarUrl] = useState('');

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            const avatarUrl = generateAvatar(address);
            setAvatarUrl(avatarUrl);
        }
    }, [address]);

    // Mock achievements data - In production, fetch from blockchain
    const achievements = [
        { id: 1, type: 'First Date', description: 'Completed your first date!' },
        { id: 2, type: '5 Star Rating', description: 'Received a 5-star rating!' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Dashboard</h2>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Profile</h3>
                    <Link
                        href="/profile/edit"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Edit Profile
                    </Link>
                </div>
                {profile && (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                            {profile.photoUrl ? (
                                <img
                                    src={profile.photoUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-200"
                                />
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-200"
                                />
                            ) : (
                                <div className="bg-gray-200 border-2 border-dashed rounded-full w-24 h-24" />
                            )}
                            <div>
                                <h4 className="text-2xl font-bold">{profile.name}, {profile.age}</h4>
                                <p className="text-gray-600">{profile.interests}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    PROFILE ID: #{profile.tokenId.toString()}
                                </p>
                                {profile.email && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-xs text-gray-500">{profile.email}</span>
                                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            Verified
                                        </span>
                                    </div>
                                )}
                                {profile.wallet_address && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-xs text-gray-500">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</span>
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                            Wallet Verified
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reputation Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Reputation</h3>
                {reputationLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="text-gray-500">Loading reputation...</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                            <div className="text-3xl font-bold text-blue-600">
                                {reputation ? reputation.averageRating.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">⭐ Avg Rating</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                            <div className="text-3xl font-bold text-purple-600">
                                {reputation ? reputation.totalDates : 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">📅 Total Dates</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                            <div className="text-3xl font-bold text-green-600">
                                {reputation ? reputation.ratingCount : 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1"> Ratings</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-xl">
                            <div className="text-3xl font-bold text-red-600">
                                {reputation ? reputation.noShows : 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1"> No-Shows</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Achievement NFTs 🏆</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                        <div
                            key={achievement.id}
                            className="p-4 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50"
                        >
                            <div className="text-2xl mb-2">🏆</div>
                            <h4 className="font-bold text-gray-900">{achievement.type}</h4>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                    ))}
                    {achievements.length === 0 && (
                        <p className="text-gray-500 col-span-2 text-center py-4">
                            No achievements yet. Go on dates to earn badges!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}