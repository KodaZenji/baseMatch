// frontend/hooks/useReputation.ts
import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { REPUTATION_ABI, CONTRACTS } from '@/lib/contracts';

interface ReputationData {
    totalDates: number;
    noShows: number;
    totalRating: number;
    ratingCount: number;
    averageRating: number;
}

export function useReputation(address: string | undefined, refreshKey: number = 0) {
    const [reputation, setReputation] = useState<ReputationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Ensure this evaluates strictly to a boolean to satisfy wagmi types
    const isContractDeployed: boolean = !!(
        CONTRACTS.REPUTATION &&
        CONTRACTS.REPUTATION.startsWith('0x') &&
        CONTRACTS.REPUTATION.length === 42
    );

    // 🐛 DEBUG
    console.log('🔍 useReputation init:', {
        address,
        isContractDeployed,
        contractAddress: CONTRACTS.REPUTATION
    });

    const { 
        data: reputationData, 
        isLoading: isReputationLoading, 
        error: readError, 
        refetch 
    } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.REPUTATION as `0x${string}`) : undefined,
        abi: REPUTATION_ABI,
        functionName: 'getReputation',
        args: address && isContractDeployed ? [address as `0x${string}`] : undefined,
        query: {
            enabled: Boolean(address && isContractDeployed),
        }
    });

    const { 
        data: averageRatingData, 
        isLoading: isRatingLoading,
        refetch: refetchRating 
    } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.REPUTATION as `0x${string}`) : undefined,
        abi: REPUTATION_ABI,
        functionName: 'getAverageRating',
        args: address && isContractDeployed ? [address as `0x${string}`] : undefined,
        query: {
            enabled: Boolean(address && isContractDeployed),
        }
    });

    // Refetch when refreshKey changes
    useEffect(() => {
        if (refreshKey > 0 && address && isContractDeployed) {
            refetch();
            refetchRating();
        }
    }, [refreshKey, refetch, refetchRating, address, isContractDeployed]);

    // 🎯 FIXED: Process data and set loading state properly
    useEffect(() => {
        console.log('🔍 useReputation data effect:', {
            address,
            isReputationLoading,
            isRatingLoading,
            hasReputationData: !!reputationData,
            hasRatingData: !!averageRatingData,
            isContractDeployed
        });

        // If contract is not deployed, set defaults and stop loading
        if (!isContractDeployed) {
            setReputation({
                totalDates: 0,
                noShows: 0,
                totalRating: 0,
                ratingCount: 0,
                averageRating: 0,
            });
            setLoading(false);
            return;
        }

        // Wait for both queries to finish loading
        if (isReputationLoading || isRatingLoading) {
            setLoading(true);
            return;
        }

        // Both queries are done loading
        setLoading(false);

        // If we have reputation data, process it
        if (reputationData) {
            try {
                const data = reputationData as any;
                const avgRating = averageRatingData ? Number(averageRatingData) : 0;

                const repData = {
                    totalDates: Number(data[0] ?? data.totalDates ?? 0),
                    noShows: Number(data[1] ?? data.noShows ?? 0),
                    totalRating: Number(data[2] ?? data.totalRating ?? 0),
                    ratingCount: Number(data[3] ?? data.ratingCount ?? 0),
                    averageRating: avgRating,
                };

                console.log('🔍 Setting reputation data:', repData);
                setReputation(repData);
            } catch (err) {
                console.error('Error processing reputation data:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                // Still set default values on error
                setReputation({
                    totalDates: 0,
                    noShows: 0,
                    totalRating: 0,
                    ratingCount: 0,
                    averageRating: 0,
                });
            }
        } else {
            // No data returned, set defaults
            console.log('🔍 No reputation data, setting defaults');
            setReputation({
                totalDates: 0,
                noShows: 0,
                totalRating: 0,
                ratingCount: 0,
                averageRating: 0,
            });
        }
    }, [reputationData, averageRatingData, isReputationLoading, isRatingLoading, isContractDeployed, address]);

    useEffect(() => {
        if (readError) {
            console.error('🔍 Read error:', readError);
            setError(readError as Error);
            setLoading(false); // Stop loading on error
        }
    }, [readError]);

    return { reputation, loading, error };
}
