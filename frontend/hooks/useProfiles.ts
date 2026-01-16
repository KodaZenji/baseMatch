// frontend/hooks/useProfiles.ts

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
    farcaster_verified?: boolean; 
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
            return;
        }

        try {
            setLoading(true);

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
                photoUrl: profile.photoUrl || '',
                email_verified: profile.email_verified || false,
                wallet_verified: profile.wallet_verified || false,
                farcaster_verified: profile.farcaster_verified || false, 
            }));

            setProfiles(fetchedProfiles);
            setLastFetchTime(now);
        } catch (error) {
            console.error('Error fetching profiles:', error);
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

    // Auto-refresh: Fetch fresh data every 30 seconds
    useEffect(() => {
        if (!isContractDeployed) return;

        const refreshInterval = setInterval(() => {
            fetchProfiles(true);
        }, 30000);

        return () => clearInterval(refreshInterval);
    }, [isContractDeployed, fetchProfiles]);

    // Refresh when user returns to tab
    useEffect(() => {
        if (!isContractDeployed) return;

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchProfiles(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isContractDeployed, fetchProfiles]);

    return {
        profiles,
        loading,
        refresh: () => fetchProfiles(true)
    };
}
