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
            // Explicitly cast to boolean to fix the "Type 'string | boolean'" build error
            enabled: Boolean(address && isContractDeployed),
        }
    });

    const { data: averageRatingData, refetch: refetchRating } = useReadContract({
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

    useEffect(() => {
        if (!isReputationLoading && reputationData) {
            try {
                // reputationData is typically returned as a readonly array/tuple from wagmi
                const data = reputationData as any;
                const avgRating = averageRatingData ? Number(averageRatingData) : 0;

                setReputation({
                    totalDates: Number(data[0] ?? data.totalDates ?? 0),
                    noShows: Number(data[1] ?? data.noShows ?? 0),
                    totalRating: Number(data[2] ?? data.totalRating ?? 0),
                    ratingCount: Number(data[3] ?? data.ratingCount ?? 0),
                    averageRating: avgRating,
                });
                setLoading(false);
            } catch (err) {
                console.error('Error processing reputation data:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setLoading(false);
            }
        } else if (!isReputationLoading && !reputationData) {
            setReputation({
                totalDates: 0,
                noShows: 0,
                totalRating: 0,
                ratingCount: 0,
                averageRating: 0,
            });
            setLoading(false);
        }
    }, [reputationData, averageRatingData, isReputationLoading]);

    useEffect(() => {
        if (readError) {
            setError(readError as Error);
        }
    }, [readError]);

    return { reputation, loading, error };
}
