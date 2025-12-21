// frontend/hooks/useAchievements.ts
import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { ACHIEVEMENT_ABI, CONTRACTS } from '@/lib/contracts';

interface Achievement {
    tokenId: number;
    type: string;
    description: string;
}

export function useAchievements(userAddress: string | undefined, refreshKey: number = 0) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // ✅ FIXED: Explicitly cast to boolean using !! to avoid "boolean | """ type issues
    const isContractDeployed = !!(
        CONTRACTS.ACHIEVEMENT && 
        CONTRACTS.ACHIEVEMENT.startsWith('0x') && 
        CONTRACTS.ACHIEVEMENT.length === 42
    );

    const { data: tokenIds, isLoading: isLoadingTokens, error: readError, refetch } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.ACHIEVEMENT as `0x${string}`) : undefined,
        abi: ACHIEVEMENT_ABI,
        functionName: 'getUserAchievements',
        // ✅ Ensure args is either the array or undefined (no empty strings)
        args: (userAddress && isContractDeployed) ? [userAddress as `0x${string}`] : undefined,
        query: {
            enabled: Boolean(userAddress) && isContractDeployed,
        }
    });

    useEffect(() => {
        if (refreshKey > 0 && userAddress && isContractDeployed) {
            refetch();
        }
    }, [refreshKey, refetch, userAddress, isContractDeployed]);

    useEffect(() => {
        const fetchAchievements = async () => {
            // Check loading state from the contract read
            if (isLoadingTokens) return;

            if (!tokenIds || !isContractDeployed) {
                setAchievements([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const tokenIdArray = tokenIds as bigint[];
                
                const achievementsList: Achievement[] = tokenIdArray.map((tokenId) => {
                    const id = Number(tokenId);
                    return {
                        tokenId: id,
                        type: getAchievementType(id),
                        description: getAchievementDescription(id),
                    };
                });

                setAchievements(achievementsList);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [tokenIds, isContractDeployed, isLoadingTokens]);

    useEffect(() => {
        if (readError) {
            setError(readError);
            setLoading(false);
        }
    }, [readError]);

    return { achievements, loading: loading || isLoadingTokens, error };
}

// Helper functions (same as before)
function getAchievementType(tokenId: number): string {
    const types: Record<number, string> = {
        1: 'First Date',
        2: '5 Dates',
        3: '10 Dates',
        4: '5 Star Rating',
        5: 'Perfect Week',
        6: 'Match Maker'
    };
    return types[tokenId] || `Achievement #${tokenId}`;
}

function getAchievementDescription(tokenId: number): string {
    const descriptions: Record<number, string> = {
        1: 'Completed your first date!',
        2: 'Went on 5 successful dates!',
        3: 'Reached 10 dates milestone!',
        4: 'Received a perfect 5-star rating!',
        5: 'Had dates every day this week!',
        6: 'Helped create 10 matches!'
    };
    return descriptions[tokenId] || 'Special achievement unlocked!';
}
