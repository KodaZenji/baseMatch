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

export function useReputation(address: string | undefined) {
    const [reputation, setReputation] = useState<ReputationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.REPUTATION &&
        CONTRACTS.REPUTATION.startsWith('0x') &&
        CONTRACTS.REPUTATION.length === 42;

    // Fetch reputation data from the Reputation contract
    const { data: reputationData, isLoading: isReputationLoading, error: readError } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.REPUTATION as `0x${string}`) : undefined,
        abi: REPUTATION_ABI,
        functionName: 'getReputation',
        args: address && isContractDeployed ? [address as `0x${string}`] : undefined,
    });

    // Fetch average rating
    const { data: averageRatingData } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.REPUTATION as `0x${string}`) : undefined,
        abi: REPUTATION_ABI,
        functionName: 'getAverageRating',
        args: address && isContractDeployed ? [address as `0x${string}`] : undefined,
    });

    useEffect(() => {
        if (!isReputationLoading && reputationData) {
            try {
                const data = reputationData as any;
                const avgRating = averageRatingData ? Number(averageRatingData) : 0;

                setReputation({
                    totalDates: Number(data.totalDates || 0),
                    noShows: Number(data.noShows || 0),
                    totalRating: Number(data.totalRating || 0),
                    ratingCount: Number(data.ratingCount || 0),
                    averageRating: avgRating,
                });
                setLoading(false);
            } catch (err) {
                console.error('Error processing reputation data:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setLoading(false);
            }
        } else if (!isReputationLoading) {
            // Contract not deployed or no address
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
            console.error('Error fetching reputation:', readError);
            setError(readError);
        }
    }, [readError]);

    return { reputation, loading, error };
}
