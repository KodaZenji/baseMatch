import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { ACHIEVEMENT_ABI, CONTRACTS } from '@/lib/contracts';

interface Achievement {
    tokenId: number;
    type: string;
    description: string;
}

export function useAchievements(userAddress: string | undefined) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const isContractDeployed = CONTRACTS.ACHIEVEMENT && 
        CONTRACTS.ACHIEVEMENT.startsWith('0x') && 
        CONTRACTS.ACHIEVEMENT.length === 42;

    // Fetch achievement token IDs for the user
    const { data: tokenIds, isLoading: isLoadingTokens, error: readError } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.ACHIEVEMENT as `0x${string}`) : undefined,
        abi: ACHIEVEMENT_ABI,
        functionName: 'getUserAchievements',
        args: userAddress && isContractDeployed ? [userAddress as `0x${string}`] : undefined,
    });

    useEffect(() => {
        const fetchAchievements = async () => {
            if (!tokenIds || !isContractDeployed) {
                setAchievements([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const tokenIdArray = tokenIds as bigint[];
                
                // Map achievement types based on token ID patterns
                // You can enhance this by fetching tokenURI for each token
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
                console.error('Error fetching achievements:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [tokenIds, isContractDeployed]);

    useEffect(() => {
        if (readError) {
            console.error('Error reading achievements:', readError);
            setError(readError);
            setLoading(false);
        }
    }, [readError]);

    return { achievements, loading, error };
}

// Helper function to determine achievement type based on token ID
// This is a simple mapping - enhance based on your achievement logic
function getAchievementType(tokenId: number): string {
    if (tokenId === 1) return 'First Date';
    if (tokenId === 2) return '5 Dates';
    if (tokenId === 3) return '10 Dates';
    if (tokenId === 4) return '5 Star Rating';
    if (tokenId === 5) return 'Perfect Week';
    if (tokenId === 6) return 'Match Maker';
    return `Achievement #${tokenId}`;
}

function getAchievementDescription(tokenId: number): string {
    if (tokenId === 1) return 'Completed your first date!';
    if (tokenId === 2) return 'Went on 5 successful dates!';
    if (tokenId === 3) return 'Reached 10 dates milestone!';
    if (tokenId === 4) return 'Received a perfect 5-star rating!';
    if (tokenId === 5) return 'Had dates every day this week!';
    if (tokenId === 6) return 'Helped create 10 matches!';
    return 'Special achievement unlocked!';
}
