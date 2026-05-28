'use client';

import { useAccount, useWriteContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS } from '@/lib/contracts';
import ProfileCard from './ProfileCard';
import { useProfiles } from '@/hooks/useProfiles';
import { useState, useEffect, useMemo } from 'react';
import GiftingModal from './GiftingModal';
import { RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import AddMiniAppModal from './AddMiniAppModal';
import { INTEREST_CATEGORIES, interestsToTags } from '@/components/ProfileEdit/ProfileFormFields';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Category accent colors for filter pills
const CATEGORY_COLORS: Record<string, { base: string; active: string }> = {
    'Onchain & Web3': {
        base: 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10',
        active: 'bg-blue-500/20 border-blue-500/60 text-blue-300',
    },
    'Lifestyle': {
        base: 'border-pink-500/30 text-pink-400 hover:bg-pink-500/10',
        active: 'bg-pink-500/20 border-pink-500/60 text-pink-300',
    },
    'Looking For': {
        base: 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10',
        active: 'bg-purple-500/20 border-purple-500/60 text-purple-300',
    },
};

function getCategoryForTag(tag: string): string {
    for (const [cat, tags] of Object.entries(INTEREST_CATEGORIES)) {
        if ((tags as readonly string[]).includes(tag)) return cat;
    }
    return 'Onchain & Web3';
}

export default function BrowseProfiles() {
    const { address } = useAccount();
    const { profiles, loading, refresh } = useProfiles();
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isTestMode, setIsTestMode] = useState(true);
    const [showGiftingModal, setShowGiftingModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState({ address: '', name: '' });
    const [isExpressingInterest, setIsExpressingInterest] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const [showMiniAppPrompt, setShowMiniAppPrompt] = useState(false);

    // ── Filter state ────────────────────────────────────────────────────────
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const { writeContract, isPending, isError, error } = useWriteContract();

    useEffect(() => {
        const hasValidContracts = CONTRACTS.MATCHING &&
            CONTRACTS.MATCHING.startsWith('0x') &&
            CONTRACTS.MATCHING.length === 42;
        setIsTestMode(!hasValidContracts);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setShuffleSeed(prev => prev + 1);
        }, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setShuffleSeed(prev => prev + 1);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleExpressInterest = async (targetAddress: string) => {
        if (!address) {
            setSuccessMessage('Please connect your wallet first.');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            return;
        }
        if (isExpressingInterest) return;
        setIsExpressingInterest(true);
        try {
            const response = await fetch('/api/match/express-interest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromAddress: address, toAddress: targetAddress })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to express interest');
            const profileName = profiles.find(p => p.wallet_address === targetAddress)?.name || 'user';
            if (data.matched) {
                setSuccessMessage(`🎉 It's a match with ${profileName}! Check your notifications.`);
                const alreadyAdded = localStorage.getItem('basematch_miniapp_added');
                if (!alreadyAdded) setTimeout(() => setShowMiniAppPrompt(true), 7000);
            } else {
                setSuccessMessage(`❤️ Interest sent to ${profileName}!`);
            }
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
            if (!isTestMode && CONTRACTS.MATCHING) {
                try {
                    writeContract({
                        address: CONTRACTS.MATCHING as `0x${string}`,
                        abi: MATCHING_ABI,
                        functionName: 'expressInterest',
                        args: [targetAddress as `0x${string}`],
                    });
                } catch (contractError) {
                    console.warn('Smart contract call failed:', contractError);
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setSuccessMessage(`Failed to express interest: ${errorMsg}`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
        } finally {
            setIsExpressingInterest(false);
        }
    };

    const handleGift = (recipientAddress: string, recipientName: string) => {
        setSelectedRecipient({ address: recipientAddress, name: recipientName });
        setShowGiftingModal(true);
    };

    useEffect(() => {
        if (isError && error) {
            let msg = 'Unable to express interest. ';
            if (error.message?.includes('profile does not exist')) msg += 'Please ensure both users have minted their profiles.';
            else if (error.message?.includes('Already expressed interest')) msg += 'You already liked this person.';
            else if (error.message?.includes('Already matched')) msg += 'You are already matched with this person.';
            else if (error.message?.includes('Cannot express interest in yourself')) msg += 'You cannot express interest in yourself.';
            else msg += 'Please try again or contact support.';
            setSuccessMessage(msg);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        }
    }, [isError, error]);

    // ── Toggle filter tag ───────────────────────────────────────────────────
    function toggleFilter(tag: string) {
        setActiveFilters(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }

    // ── Filter + shuffle profiles ───────────────────────────────────────────
    const shuffledProfiles = useMemo(() => {
        const withoutSelf = profiles.filter(
            p => p.wallet_address.toLowerCase() !== address?.toLowerCase()
        );

        // If no filters active, return all shuffled
        if (activeFilters.length === 0) return shuffleArray(withoutSelf);

        // Keep profiles that share at least one active filter tag
        const filtered = withoutSelf.filter(profile => {
            const profileTags = interestsToTags(profile.interests || '');
            return activeFilters.some(f => profileTags.includes(f));
        });

        return shuffleArray(filtered);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profiles, address, shuffleSeed, activeFilters]);

    if (loading && profiles.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading profiles...</div>
            </div>
        );
    }

    return (
        <div>
            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Discover People</h2>
                <div className="flex items-center gap-2">
                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-semibold ${
                            showFilters || activeFilters.length > 0
                                ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-pink-400 hover:text-pink-400'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">Filter</span>
                        {activeFilters.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">
                                {activeFilters.length}
                            </span>
                        )}
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* ── Interest Filter Panel ── */}
            {showFilters && (
                <div className="mb-6 p-4 rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            Filter by Interests
                        </p>
                        {activeFilters.length > 0 && (
                            <button
                                onClick={() => setActiveFilters([])}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" /> Clear all
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {Object.entries(INTEREST_CATEGORIES).map(([category, tags]) => {
                            const colors = CATEGORY_COLORS[category];
                            return (
                                <div key={category}>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        {category}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => {
                                            const isActive = activeFilters.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleFilter(tag)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                        isActive ? colors.active : colors.base
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active filter summary */}
                    {activeFilters.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/8 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">Showing profiles with:</span>
                            {activeFilters.map(f => {
                                const cat = getCategoryForTag(f);
                                const colors = CATEGORY_COLORS[cat];
                                return (
                                    <span key={f} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.active}`}>
                                        {f}
                                        <button onClick={() => toggleFilter(f)} className="hover:opacity-70">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {isTestMode && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
                    Test Mode: Using mock profiles. Express interest functionality will create notifications.
                </div>
            )}

            {showSuccess && (
                <div className={`mb-4 p-3 rounded-lg ${
                    successMessage.includes('Failed') || successMessage.includes('error')
                        ? 'bg-red-100 text-red-700'
                        : successMessage.includes('match')
                            ? 'bg-green-100 text-green-700 font-semibold text-lg'
                            : 'bg-blue-100 text-blue-700'
                }`}>
                    {successMessage}
                </div>
            )}

            <div className="relative">
                {loading && profiles.length > 0 && (
                    <div className="absolute inset-0 bg-white dark:bg-slate-900 bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">Refreshing...</div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shuffledProfiles.map(profile => (
                        <ProfileCard
                            key={profile.wallet_address}
                            profile={profile}
                            onExpressInterest={handleExpressInterest}
                            onGift={() => handleGift(profile.wallet_address, profile.name)}
                            isPending={isPending || isExpressingInterest}
                        />
                    ))}
                </div>
            </div>

            {shuffledProfiles.length === 0 && (
                <div className="text-center py-12">
                    {activeFilters.length > 0 ? (
                        <>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No profiles match your filters</p>
                            <button
                                onClick={() => setActiveFilters([])}
                                className="mt-3 text-pink-500 hover:text-pink-400 text-sm font-semibold transition-colors"
                            >
                                Clear filters to see everyone
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No profiles to show yet</p>
                            <p className="text-gray-400 dark:text-gray-500">Check back later or invite your friends!</p>
                        </>
                    )}
                </div>
            )}

            <GiftingModal
                isOpen={showGiftingModal}
                onClose={() => setShowGiftingModal(false)}
                recipientAddress={selectedRecipient.address}
                recipientName={selectedRecipient.name}
            />

            {showMiniAppPrompt && (
                <AddMiniAppModal
                    trigger="after-match"
                    onClose={() => setShowMiniAppPrompt(false)}
                />
            )}
        </div>
    );
}
