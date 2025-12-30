// frontend/hooks/useProfiles.ts
// Enhanced version with cache-busting and periodic refresh

import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';

interface Profile {
    wallet_address: string;
    name: string;
    birthYear: number;
    gender: string;
    interests: string;
    photoUrl: string;
    email_verified?: boolean;
    wallet_verified?: boolean;
    reputation?: {
        totalDates: number;
        noShows: number;
        averageRating: number;
    };
}

export function useProfiles() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.PROFILE_NFT &&
        CONTRACTS.PROFILE_NFT.startsWith('0x') &&
        CONTRACTS.PROFILE_NFT.length === 42;

    // Memoized fetch function that can be called externally
    const fetchProfiles = useCallback(async (forceRefresh = false) => {
        if (!isContractDeployed) {
            setProfiles([]);
            setLoading(false);
            return;
        }

        // Prevent too frequent fetches (debounce)
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < 2000) {
            console.log('⏱️ Skipping fetch - too soon since last fetch');
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 Fetching profiles from database...');

            // Add cache-busting timestamp to ensure fresh data
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`/api/profiles${cacheBuster}`, {
                // Disable browser cache for this request
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profiles');
            }

            const data = await response.json();
            const fetchedProfiles: Profile[] = (data.profiles || []).map((profile: any) => ({
                wallet_address: profile.wallet_address,
                name: profile.name || '',
                birthYear: profile.birthYear || 0,
                gender: profile.gender || '',
                interests: profile.interests || '',
                photoUrl: profile.photoUrl || '', // ✅ This will now get fresh data
                email_verified: profile.email_verified || false,
                wallet_verified: profile.wallet_verified || false,
            }));

            console.log(`✅ Fetched ${fetchedProfiles.length} profiles`);
            console.log('📸 Sample photoUrls:', fetchedProfiles.slice(0, 3).map(p => ({
                name: p.name,
                photoUrl: p.photoUrl
            })));

            setProfiles(fetchedProfiles);
            setLastFetchTime(now);
        } catch (error) {
            console.error('❌ Error fetching profiles:', error);
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, [isContractDeployed, lastFetchTime]);

    // Initial fetch on mount
    useEffect(() => {
        const timer = setTimeout(() => fetchProfiles(true), 500);
        return () => clearTimeout(timer);
    }, [isContractDeployed]);

    // ✅ AUTO-REFRESH: Fetch fresh data every 30 seconds
    // This ensures users see updated profile pictures without manual refresh
    useEffect(() => {
        if (!isContractDeployed) return;

        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing profiles...');
            fetchProfiles(true);
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(refreshInterval);
    }, [isContractDeployed, fetchProfiles]);

    // ✅ VISIBILITY CHANGE: Refresh when user returns to tab
    // This catches profile updates that happened while user was away
    useEffect(() => {
        if (!isContractDeployed) return;

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('👀 Tab became visible - refreshing profiles');
                fetchProfiles(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isContractDeployed, fetchProfiles]);

    return {
        profiles,
        loading,
        refresh: () => fetchProfiles(true) // ✅ Expose manual refresh function
    };
}
