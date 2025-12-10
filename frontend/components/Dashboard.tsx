'use client';

import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';
import { useReputation } from '@/hooks/useReputation';
import { useAchievements } from '@/hooks/useAchievements';
import { generateAvatar } from '@/lib/avatarUtils';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
    const { address } = useAccount();
    const { profile } = useProfile(address);
    const { reputation, loading: reputationLoading } = useReputation(address);
    const { achievements, loading: achievementsLoading } = useAchievements(address);
    const [avatarUrl, setAvatarUrl] = useState('');

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            const avatarUrl = generateAvatar(address);
            setAvatarUrl(avatarUrl);
        }
    }, [address]);

    // Get achievement emoji based on type
    const getAchievementEmoji = (type: string) => {
        if (type.includes('First Date')) return '🎉';
        if (type.includes('5 Dates')) return '🔥';
        if (type.includes('10 Dates')) return '💎';
        if (type.includes('5 Star')) return '⭐';
        if (type.includes('Perfect Week')) return '🗓️';
        if (type.includes('Match Maker')) return '💘';
        return '🏆';
    };

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
                                <h4 className="text-2xl text-gray-600 font-bold">{profile.name}, {profile.age}</h4>
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
                            <div className="text-sm text-gray-600 mt-1">👍 Ratings</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-xl">
                            <div className="text-3xl font-bold text-red-600">
                                {reputation ? reputation.noShows : 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">❌ No-Shows</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Achievement NFTs - Live from Blockchain */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Achievement NFTs 🏆</h3>
                    {!achievementsLoading && achievements.length > 0 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                            {achievements.length} {achievements.length === 1 ? 'Badge' : 'Badges'}
                        </span>
                    )}
                </div>

                {achievementsLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                            <span className="text-gray-500">Loading achievements from blockchain...</span>
                        </div>
                    </div>
                ) : achievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievements.map((achievement) => (
                            <div
                                key={achievement.tokenId}
                                className="group relative p-6 border-2 border-purple-200 rounded-xl bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 hover:shadow-lg transition-all duration-300 hover:scale-105"
                            >
                                {/* NFT Badge */}
                                <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                    NFT #{achievement.tokenId}
                                </div>
                                
                                <div className="text-4xl mb-3">{getAchievementEmoji(achievement.type)}</div>
                                <h4 className="font-bold text-gray-900 mb-1">{achievement.type}</h4>
                                <p className="text-sm text-gray-600">{achievement.description}</p>
                                
                                {/* On-chain indicator */}
                                <div className="mt-3 flex items-center text-xs text-purple-600">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">Verified On-Chain</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 space-y-3">
                        
                        <p className="text-gray-500 font-medium">No achievement NFTs yet</p>
                        <p className="text-sm text-gray-400">
                            Go on dates and earn blockchain-verified badges!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
