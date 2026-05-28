// frontend/components/Dashboard.tsx
// FIXES:
// 1. Calls refreshProfile() on mount so interests always show latest after edit
// 2. Listens for 'profile-updated' custom event dispatched by useProfileEdit after save

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

// Helper — render interests as tags if comma-separated, else plain text
function InterestsTags({ interests }: { interests: string }) {
    if (!interests) return null;
    const tags = interests.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length <= 1) return <p className="text-gray-600 mt-2">{interests}</p>;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border border-purple-200">
                    {tag}
                </span>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const { address } = useAccount();
    const { profile, refreshProfile } = useProfile(address);

    const [refreshKey, setRefreshKey] = useState(0);
    const { reputation, loading: reputationLoading } = useReputation(address, refreshKey);
    const { achievements, loading: achievementsLoading } = useAchievements(address, refreshKey);

    const [avatarUrl, setAvatarUrl] = useState('');
    const [achievementsWithImages, setAchievementsWithImages] = useState<AchievementWithImage[]>([]);
    const [selectedAchievementImage, setSelectedAchievementImage] = useState<{ imageUrl: string; type: string } | null>(null);

    const [showDateConfirmation, setShowDateConfirmation] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedStake, setSelectedStake] = useState<PendingStake | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isPendingBlockchainUpdate, setIsPendingBlockchainUpdate] = useState(false);

    // ── FIX 1: Refresh profile on mount so interests always show latest ──────
    // This fires every time the user navigates to the Dashboard tab,
    // which covers coming back from ProfileEdit with updated interests.
    useEffect(() => {
        refreshProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── FIX 2: Listen for profile-updated event from useProfileEdit ──────────
    // useProfileEdit should dispatch this after a successful save:
    // window.dispatchEvent(new CustomEvent('profile-updated'));
    useEffect(() => {
        const handleProfileUpdated = () => {
            console.log('📝 Profile updated — refreshing Dashboard...');
            refreshProfile();
        };
        window.addEventListener('profile-updated', handleProfileUpdated);
        return () => window.removeEventListener('profile-updated', handleProfileUpdated);
    }, [refreshProfile]);

    useEffect(() => {
        if (address) setAvatarUrl(generateAvatar(address));
    }, [address]);

    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            setShowRatingModal(true);
            setCountdown(null);
        }
    }, [countdown]);

    const handleConfirmClick = (stake: PendingStake) => {
        setSelectedStake(stake);
        setShowDateConfirmation(true);
    };

    const handleDateConfirmed = async () => {
        try {
            setShowDateConfirmation(false);
            setIsPendingBlockchainUpdate(true);
            setTimeout(() => {
                setRefreshKey(prev => prev + 1);
                setIsPendingBlockchainUpdate(false);
            }, 10000);
            setCountdown(10);
        } catch (error) {
            console.error('Error after confirmation:', error);
            setIsPendingBlockchainUpdate(false);
        }
    };

    const handleRatingSubmitted = () => {
        setIsPendingBlockchainUpdate(true);
        setTimeout(() => {
            setRefreshKey(prev => prev + 1);
            setIsPendingBlockchainUpdate(false);
        }, 10000);
    };

    const handleRatingClose = () => {
        setShowRatingModal(false);
        setSelectedStake(null);
    };

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
                        if (!response.ok) throw new Error(`Failed: ${response.status}`);
                        const metadata = await response.json();
                        return { ...achievement, imageUrl: metadata.image };
                    } catch {
                        return achievement;
                    }
                })
            );
            setAchievementsWithImages(withImages);
        };
        if (achievements.length > 0) fetchAchievementImages();
    }, [achievements]);

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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Your Dashboard</h2>

            <StakeReminderBanner onConfirmClick={handleConfirmClick} />

            {isPendingBlockchainUpdate && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="animate-spin text-blue-600" size={24} />
                        <div>
                            <p className="font-semibold text-blue-900">Updating Your Stats...</p>
                            <p className="text-sm text-blue-700">Your blockchain transaction is being confirmed.</p>
                        </div>
                    </div>
                </div>
            )}

            {countdown !== null && countdown > 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-4 text-center animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-pink-700 font-bold text-lg">
                        <Clock size={24} />
                        Rating modal opening in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </div>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Profile</h3>
                    <Link href="/profile/edit" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Edit Profile
                    </Link>
                </div>
                {profile && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            {profile.photoUrl ? (
                                <img src={profile.photoUrl} alt="Your avatar" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Your avatar" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
                            ) : (
                                <div className="bg-gray-200 border-2 border-dashed rounded-full w-24 h-24" />
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-2xl text-gray-900 dark:text-white font-bold">{profile.name}, {profile.birthYear}</h4>

                                {/* ── FIX: Show interests as tags instead of plain text ── */}
                                <InterestsTags interests={profile.interests || ''} />

                                <p className="text-xs text-gray-500 mt-2">PROFILE ID: #{profile.tokenId?.toString()}</p>
                                {profile.email && (
                                    <div className="flex items-center mt-3">
                                        <span className="text-xs text-gray-600">{profile.email}</span>
                                        <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">Verified</span>
                                    </div>
                                )}
                                {profile.wallet_address && (
                                    <div className="flex items-center mt-2">
                                        <span className="text-xs text-gray-600">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</span>
                                        <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded">Wallet Verified</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reputation Stats — unchanged */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reputation</h3>
                    <button onClick={() => setRefreshKey(prev => prev + 1)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1" disabled={reputationLoading}>
                        <RefreshCw className={reputationLoading ? 'animate-spin' : ''} size={16} /> Refresh
                    </button>
                </div>
                {reputationLoading ? (
                    <div className="flex justify-center items-center h-32"><div className="text-gray-500">Loading reputation...</div></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <Star className="text-blue-600" size={32} />, value: reputation ? reputation.averageRating.toFixed(1) : '0.0', label: 'Avg Rating', color: 'from-blue-50 to-blue-100', textColor: 'text-blue-600' },
                            { icon: <Calendar className="text-purple-600" size={32} />, value: reputation ? reputation.totalDates : 0, label: 'Total Dates', color: 'from-purple-50 to-purple-100', textColor: 'text-purple-600' },
                            { icon: <ThumbsUp className="text-green-600" size={32} />, value: reputation ? reputation.ratingCount : 0, label: 'Ratings', color: 'from-green-50 to-green-100', textColor: 'text-green-600' },
                            { icon: <AlertCircle className="text-red-600" size={32} />, value: reputation ? reputation.noShows : 0, label: 'No-Shows', color: 'from-red-50 to-red-100', textColor: 'text-red-600' },
                        ].map(({ icon, value, label, color, textColor }) => (
                            <div key={label} className={`text-center p-4 bg-gradient-to-br ${color} rounded-xl`}>
                                <div className="flex justify-center mb-2">{icon}</div>
                                <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
                                <div className="text-sm text-gray-700 font-medium mt-2">{label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Achievement NFTs — unchanged */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Trophy className="text-amber-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Achievement NFTs</h3>
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
                            <div key={achievement.tokenId} className="group relative border-2 border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 hover:shadow-md transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer"
                                onClick={() => achievement.imageUrl && setSelectedAchievementImage({ imageUrl: achievement.imageUrl, type: achievement.type })}>
                                {achievement.imageUrl ? (
                                    <>
                                        <img src={achievement.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={achievement.type} className="w-full h-32 object-cover" />
                                        <div className="p-3">
                                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">NFT</div>
                                            <h4 className="font-bold text-xs text-gray-900 mb-1 line-clamp-2">{achievement.type}</h4>
                                            <div className="flex items-center text-xs text-purple-600">
                                                <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                <span className="font-medium">Verified</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-3 flex flex-col items-center justify-center h-32">
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">NFT</div>
                                        <div className="mb-1 text-2xl">{getAchievementIcon(achievement.type)}</div>
                                        <h4 className="font-bold text-xs text-gray-900 mb-1 text-center line-clamp-2">{achievement.type}</h4>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 space-y-3">
                        <p className="text-gray-400 font-medium">No achievement yet</p>
                        <p className="text-sm text-gray-500">Go on dates and earn badges!</p>
                    </div>
                )}
            </div>

            {/* Achievement Image Preview Modal */}
            {selectedAchievementImage && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setSelectedAchievementImage(null); } }}
                    onTouchStart={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setSelectedAchievementImage(null); } }}>
                    <div className="relative bg-black rounded-3xl overflow-hidden max-w-md w-full shadow-2xl"
                        onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                        <button onMouseDown={(e) => { e.preventDefault(); setSelectedAchievementImage(null); }} onTouchStart={(e) => { e.preventDefault(); setSelectedAchievementImage(null); }}
                            className="absolute top-3 right-3 text-white bg-black bg-opacity-60 rounded-full w-10 h-10 flex items-center justify-center z-10 shadow-lg hover:bg-opacity-80">
                            <X size={20} />
                        </button>
                        <img src={selectedAchievementImage.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={selectedAchievementImage.type} className="w-full h-auto object-contain pointer-events-none" />
                        <div className="bg-black py-4 text-center border-t border-gray-800">
                            <p className="text-white text-lg font-medium">{selectedAchievementImage.type}</p>
                            <p className="text-gray-400 text-xs mt-1">Tap anywhere to close</p>
                        </div>
                    </div>
                </div>
            )}

            {showDateConfirmation && selectedStake && (
                <DateConfirmationModal stakeId={selectedStake.stakeId} matchAddress={selectedStake.matchAddress} matchName={selectedStake.matchName} meetingTime={selectedStake.meetingTime} stakeAmount={selectedStake.stakeAmount} onClose={() => setShowDateConfirmation(false)} onSuccess={handleDateConfirmed} />
            )}
            {showRatingModal && selectedStake && (
                <RatingModal matchAddress={selectedStake.matchAddress} onClose={handleRatingClose} onSuccess={handleRatingSubmitted} />
            )}
        </div>
    );
}
