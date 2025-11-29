import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';

interface MatchProfile {
    address: string;
    name: string;
    age: number;
    gender: string;
    interests: string;
    photoUrl: string;
    matchedAt: number;
}

export function useMatches(userAddress: string | undefined) {
    const [matches, setMatches] = useState<MatchProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.MATCHING && CONTRACTS.MATCHING.startsWith('0x') && CONTRACTS.MATCHING.length === 42;
    const isProfileContractDeployed = CONTRACTS.PROFILE_NFT && CONTRACTS.PROFILE_NFT.startsWith('0x') && CONTRACTS.PROFILE_NFT.length === 42;

    // Fetch matches from the Matching contract
    const { data: matchAddresses, isLoading: matchesLoading } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.MATCHING as `0x${string}`) : undefined,
        abi: MATCHING_ABI,
        functionName: 'getMatches',
        args: userAddress && isContractDeployed ? [userAddress as `0x${string}`] : undefined,
    });

    // Fetch profile data for each match
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

                // Fetch actual profile data from API for each match
                const profilePromises = matchArray.map(async (address) => {
                    try {
                        const response = await fetch(`/api/profile/${address}`);
                        if (response.ok) {
                            const profileData = await response.json();
                            return {
                                address,
                                name: profileData.name || 'Unknown User',
                                age: profileData.age || 0,
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
                        age: 0,
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

    return { matches, loading };
}