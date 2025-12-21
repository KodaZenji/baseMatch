// frontend/components/Dashboard.tsx
// FIXED: Added auto-refresh after date confirmation to show updated stats

'use client';

import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';
import { useReputation } from '@/hooks/useReputation';
import { useAchievements } from '@/hooks/useAchievements';
import { generateAvatar } from '@/lib/avatarUtils';
import Link from 'next/link';
import StakeReminderBanner from './StakeReminderBanner';
import DateConfirmationModal from './DateConfirmationModal';
import RatingModal from './RatingModal';
import { Star, Calendar, ThumbsUp, AlertCircle, Clock, Trophy, Zap, Flame, Sparkles, Heart, X, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PendingStake {
    stakeId: string;
    matchAddress: string;
    matchName: string;
    meetingTime: number;
    stakeAmount: string;
    deadline?: number;
    timeRemaining?: number;
    timeWaiting?: number;
    timeUntilMeeting?: number;
    hasMeetingPassed?: boolean;
    canCancel?: boolean;
    role?: 'creator' | 'acceptor';
}

interface AchievementWithImage {
    tokenId: number;
    type: string;
    description: string;
    imageUrl?: string;
}

export default function Dashboard() {
    const { address } = useAccount();
    const { profile } = useProfile(address);
    
    // ✅ NEW: Add refresh key to force re-fetch from blockchain
    const [refreshKey, setRefreshKey] = useState(0);
    const { reputation, loading: reputationLoading } = useReputation(address, refreshKey);
    const { achievements, loading: achievementsLoading } = useAchievements(address, refreshKey);
    
    const [avatarUrl, setAvatarUrl] = useState('');
    const [achievementsWithImages, setAchievementsWithImages] = useState<AchievementWithImage[]>([]);
    const [selectedAchievementImage, setSelectedAchievementImage] = useState<{ imageUrl: string; type: string } | null>(null);

    // Modal states
    const [showDateConfirmation, setShowDateConfirmation] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedStake, setSelectedStake] = useState<PendingStake | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    
    // ✅ NEW: Pending state to show when blockchain updates are in progress
    const [isPendingBlockchainUpdate, setIsPendingBlockchainUpdate] = useState(false);

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            const avatarUrl = generateAvatar(address);
            setAvatarUrl(avatarUrl);
        }
    }, [address]);

    // Handle countdown timer for rating modal (10 seconds after confirmation)
    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            setShowRatingModal(true);
            setCountdown(null);
        }
    }, [countdown]);

    // Handle when user clicks "Confirm Now" from StakeReminderBanner
    const handleConfirmClick = (stake: PendingStake) => {
        setSelectedStake(stake);
        setShowDateConfirmation(true);
    };

    // ✅ IMPROVED: Handle date confirmation success with blockchain update tracking
    const handleDateConfirmed = async () => {
        try {
            console.log('Date confirmed successfully');

            // Close the confirmation modal
            setShowDateConfirmation(false);

            // ✅ NEW: Show pending state
            setIsPendingBlockchainUpdate(true);

            // ✅ NEW: Wait 10 seconds for blockchain to confirm, then refresh
            setTimeout(() => {
                console.log('🔄 Refreshing reputation and achievements from blockchain...');
                setRefreshKey(prev => prev + 1);
                setIsPendingBlockchainUpdate(false);
            }, 10000); // 10 seconds should be enough for blockchain confirmation

            // Start countdown to rating modal
            setCountdown(10);

        } catch (error) {
            console.error('Error after confirmation:', error);
            setIsPendingBlockchainUpdate(false);
        }
    };

    // ✅ NEW: Handle rating submission with blockchain refresh
    const handleRatingSubmitted = () => {
        console.log('🔄 Rating submitted, refreshing stats...');
        setIsPendingBlockchainUpdate(true);
        
        // Wait for blockchain confirmation, then refresh
        setTimeout(() => {
            setRefreshKey(prev => prev + 1);
            setIsPendingBlockchainUpdate(false);
        }, 10000);
    };

    // Handle rating modal close
    const handleRatingClose = () => {
        setShowRatingModal(false);
        setSelectedStake(null);
    };

    // Fetch achievement images from IPFS metadata
    useEffect(() => {
        const fetchAchievementImages = async () => {
            const withImages = await Promise.all(
                achievements.map(async (achievement) => {
                    try {
                        const typeMap: { [key: string]: string } = {
                            'First Date': 'first-date',
                            '5 Dates': '5 dates',
                            '10 Dates': '10-dates',
                            '5-Star Rating': '5 star',
                            'Perfect Week': 'perfect-week',
                            'Match Maker': 'match-maker'
                        };

                        const filename = typeMap[achievement.type] || achievement.type.toLowerCase().replace(/\s+/g, '-');
                        const metadataUrl = `https://ipfs.io/ipfs/QmUaKVFosUfGagYmuE9fTqkw19LKJ9F3Job7QEtrnUZJdW/${filename}.json`;
                        const response = await fetch(metadataUrl);
                        if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.status}`);
                        const metadata = await response.json();
                        return {
                            ...achievement,
                            imageUrl: metadata.image
                        };
                    } catch (error) {
                        console.error(`Failed to fetch metadata for ${achievement.type}:`, error);
                        return achievement;
                    }
                })
            );
            setAchievementsWithImages(withImages);
        };

        if (achievements.length > 0) {
            fetchAchievementImages();
        }
    }, [achievements]);

    // Get achievement icon based on type (fallback)
    const getAchievementIcon = (type: string) => {
        if (type.includes('First Date')) return <Zap className="text-yellow-500" size={28} />;
        if (type.includes('5 Dates')) return <Flame className="text-orange-500" size={28} />;
        if (type.includes('10 Dates')) return <Sparkles className="text-blue-500" size={28} />;
        if (type.includes('5 Star')) return <Star className="text-yellow-500" size={28} />;
        if (type.includes('Perfect Week')) return <Calendar className="text-purple-500" size={28} />;
        if (type.includes('Match Maker')) return <Heart className="text-pink-500" size={28} />;
        return <Trophy className="text-amber-600" size={28} />;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Dashboard</h2>

            {/* Stake Reminder Banner */}
            <StakeReminderBanner onConfirmClick={handleConfirmClick} />

            {/* ✅ NEW: Pending blockchain update indicator */}
            {isPendingBlockchainUpdate && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="animate-spin text-blue-600" size={24} />
                        <div>
                            <p className="font-semibold text-blue-900">Updating Your Stats...</p>
                            <p className="text-sm text-blue-700">
                                Your blockchain transaction is being confirmed. Stats will update shortly.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Countdown indicator */}
            {countdown !== null && countdown > 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-4 text-center animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-pink-700 font-bold text-lg">
                        <Clock size={24} />
                        Rating modal opening in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </div>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Profile</h3>
                    <Link
                        href="/profile/edit"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Edit Profile
                    </Link>
                </div>
                {profile && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            {profile.photoUrl ? (
                                <img
                                    src={profile.photoUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                                />
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Your avatar"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                                />
                            ) : (
                                <div className="bg-gray-200 border-2 border-dashed rounded-full w-24 h-24" />
                            )}
                            <div>
                                <h4 className="text-2xl text-gray-900 font-bold">{profile.name}, {profile.age}</h4>
                                <p className="text-gray-600 mt-2">{profile.interests}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    PROFILE ID: #{profile.tokenId.toString()}
                                </p>
                                {profile.email && (
                                    <div className="flex items-center mt-3">
                                        <span className="text-xs text-gray-600">{profile.email}</span>
                                        <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">
                                            Verified
                                        </span>
                                    </div>
                                )}
                                {profile.wallet_address && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-xs text-gray-600">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</span>
                                        <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded">
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
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Reputation</h3>
                    {/* ✅ NEW: Manual refresh button */}
                    <button
                        onClick={() => {
                            console.log('🔄 Manual refresh triggered');
                            setRefreshKey(prev => prev + 1);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        disabled={reputationLoading}
                    >
                        <RefreshCw className={reputationLoading ? 'animate-spin' : ''} size={16} />
                        Refresh
                    </button>
                </div>
                {reputationLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="text-gray-500">Loading reputation...</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                            <div className="flex justify-center mb-2">
                                <Star className="text-blue-600" size={32} />
                            </div>
                            <div className="text-3xl font-bold text-blue-600">
                                {reputation ? reputation.averageRating.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-sm text-gray-700 font-medium mt-2">Avg Rating</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                            <div className="flex justify-center mb-2">
                                <Calendar className="text-purple-600" size={32} />
                            </div>
                            <div className="text-3xl font-bold text-purple-600">
                                {reputation ? reputation.totalDates : 0}
                            </div>
                            <div className="text-sm text-gray-700 font-medium mt-2">Total Dates</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                            <div className="flex justify-center mb-2">
                                <ThumbsUp className="text-green-600" size={32} />
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                                {reputation ? reputation.ratingCount : 0}
                            </div>
                            <div className="text-sm text-gray-700 font-medium mt-2">Ratings</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                            <div className="flex justify-center mb-2">
                                <AlertCircle className="text-red-600" size={32} />
                            </div>
                            <div className="text-3xl font-bold text-red-600">
                                {reputation ? reputation.noShows : 0}
                            </div>
                            <div className="text-sm text-gray-700 font-medium mt-2">No-Shows</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Achievement NFTs */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Trophy className="text-amber-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-900">Achievement NFTs</h3>
                    </div>
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
                ) : achievementsWithImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {achievementsWithImages.map((achievement) => (
                            <div
                                key={achievement.tokenId}
                                className="group relative border-2 border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 hover:shadow-md transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer"
                                onClick={() => {
                                    if (achievement.imageUrl) {
                                        setSelectedAchievementImage({
                                            imageUrl: achievement.imageUrl,
                                            type: achievement.type
                                        });
                                    }
                                }}
                            >
                                {achievement.imageUrl ? (
                                    <>
                                        <img
                                            src={achievement.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                                            alt={achievement.type}
                                            className="w-full h-32 object-cover"
                                        />
                                        <div className="p-3">
                                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                                                NFT
                                            </div>
                                            <h4 className="font-bold text-xs text-gray-900 mb-1 line-clamp-2">{achievement.type}</h4>
                                            <div className="flex items-center text-xs text-purple-600">
                                                <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-medium">Verified</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-3 flex flex-col items-center justify-center h-32">
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                                            NFT
                                        </div>
                                        <div className="mb-1 text-2xl">{getAchievementIcon(achievement.type)}</div>
                                        <h4 className="font-bold text-xs text-gray-900 mb-1 text-center line-clamp-2">{achievement.type}</h4>
                                        <div className="flex items-center text-xs text-purple-600">
                                            <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-medium">Verified</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 space-y-3">
                        <p className="text-gray-400 font-medium">No achievement yet</p>
                        <p className="text-sm text-gray-500">
                            Go on dates and earn badges!
                        </p>
                    </div>
                )}
            </div>

            {/* Achievement Image Preview Modal */}
            {selectedAchievementImage && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedAchievementImage(null);
                        }
                    }}
                    onTouchStart={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedAchievementImage(null);
                        }
                    }}
                >
                    <div
                        className="relative bg-black rounded-3xl overflow-hidden max-w-md w-full shadow-2xl"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedAchievementImage(null);
                            }}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedAchievementImage(null);
                            }}
                            className="absolute top-3 right-3 text-white bg-black bg-opacity-60 rounded-full w-10 h-10 flex items-center justify-center z-10 shadow-lg hover:bg-opacity-80 transition-all"
                        >
                            <X size={20} />
                        </button>

                        <img
                            src={selectedAchievementImage.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                            alt={selectedAchievementImage.type}
                            className="w-full h-auto object-contain pointer-events-none"
                        />

                        <div className="bg-black py-4 text-center border-t border-gray-800">
                            <p className="text-white text-lg font-medium">{selectedAchievementImage.type}</p>
                            <p className="text-gray-400 text-xs mt-1">Tap anywhere to close</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Confirmation Modal */}
            {showDateConfirmation && selectedStake && (
                <DateConfirmationModal
                    stakeId={selectedStake.stakeId}
                    matchAddress={selectedStake.matchAddress}
                    matchName={selectedStake.matchName}
                    meetingTime={selectedStake.meetingTime}
                    stakeAmount={selectedStake.stakeAmount}
                    onClose={() => setShowDateConfirmation(false)}
                    onSuccess={handleDateConfirmed}
                />
            )}

            {/* Rating Modal - Opens 10 seconds after date confirmation */}
            {showRatingModal && selectedStake && (
                <RatingModal
                    matchAddress={selectedStake.matchAddress}
                    onClose={handleRatingClose}
                    onSuccess={handleRatingSubmitted}
                />
            )}
        </div>
    );
}
