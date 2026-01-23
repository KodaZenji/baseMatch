import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';

interface MatchProfile {
    address: string;
    name: string;
    birthYear?: number;  // Keep optional for missing/invalid data
    gender: string;
    interests: string;
    photoUrl: string;
    matchedAt: number;
}

export function useMatches(userAddress: string | undefined) {
    const [matches, setMatches] = useState<MatchProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Ensure contracts are deployed
    const isContractDeployed =
        CONTRACTS.MATCHING && CONTRACTS.MATCHING.startsWith('0x') && CONTRACTS.MATCHING.length === 42;
    const isProfileContractDeployed =
        CONTRACTS.PROFILE_NFT && CONTRACTS.PROFILE_NFT.startsWith('0x') && CONTRACTS.PROFILE_NFT.length === 42;

    // Read matches from blockchain
    const { data: matchAddresses, isLoading: matchesLoading } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.MATCHING as `0x${string}`) : undefined,
        abi: MATCHING_ABI,
        functionName: 'getMatches',
        args: userAddress && isContractDeployed ? [userAddress as `0x${string}`] : undefined,
    });

    useEffect(() => {
        if (!matchAddresses || !isProfileContractDeployed || !userAddress) {
            setMatches([]);
            setLoading(false);
            return;
        }

        const fetchProfiles = async () => {
            try {
                setLoading(true);

                const matchArray = matchAddresses as `0x${string}`[];

                // Fetch each profile
                const profilePromises = matchArray.map(async (address) => {
                    try {
                        const response = await fetch(`/api/profile/${address}`);
                        if (response.ok) {
                            const profileData = await response.json();

                            // Validate birthYear: must be a number and reasonable (>1900)
                            const birthYear =
                                profileData.birthYear && profileData.birthYear > 1900
                                    ? Number(profileData.birthYear)
                                    : undefined;

                            return {
                                address,
                                name: profileData.name || 'Unknown User',
                                birthYear,
                                gender: profileData.gender || '',
                                interests: profileData.interests || '',
                                photoUrl: profileData.photoUrl || '',
                                matchedAt: Date.now(),
                            };
                        }
                    } catch (err) {
                        console.warn(`Failed to fetch profile for match ${address}:`, err);
                    }

                    // Fallback if fetch fails
                    return {
                        address,
                        name: 'User',
                        birthYear: undefined,
                        gender: '',
                        interests: 'Interests not loaded',
                        photoUrl: '',
                        matchedAt: Date.now(),
                    };
                });

                const matches = await Promise.all(profilePromises);
                setMatches(matches);
            } catch (error) {
                console.error('Error fetching matches:', error);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [matchAddresses, isProfileContractDeployed, userAddress]);

    return { matches, loading: loading || matchesLoading };
}
