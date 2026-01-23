import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { MATCHING_ABI, CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';

export interface MatchProfile {
    address: string;
    name: string;
    birthYear: number;   // always defined
    age: number;         // precomputed
    gender: string;
    interests: string;
    photoUrl: string;
    matchedAt: number;
}

export function useMatches(userAddress: string | undefined) {
    const [matches, setMatches] = useState<MatchProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const isContractDeployed = CONTRACTS.MATCHING && CONTRACTS.MATCHING.startsWith('0x') && CONTRACTS.MATCHING.length === 42;
    const isProfileContractDeployed = CONTRACTS.PROFILE_NFT && CONTRACTS.PROFILE_NFT.startsWith('0x') && CONTRACTS.PROFILE_NFT.length === 42;

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
                const currentYear = new Date().getFullYear();

                const profilePromises = matchArray.map(async (address) => {
                    try {
                        const response = await fetch(`/api/profile/${address}`);
                        if (!response.ok) throw new Error('Failed to fetch profile');

                        const profileData = await response.json();

                        // Ensure birthYear is a number
                        const birthYear = Number(profileData.birthYear) || currentYear; // fallback if somehow 0
                        const age = currentYear - birthYear;

                        return {
                            address,
                            name: profileData.name || 'Unknown User',
                            birthYear,
                            age,
                            gender: profileData.gender || '',
                            interests: profileData.interests || '',
                            photoUrl: profileData.photoUrl || '',
                            matchedAt: Date.now(),
                        } as MatchProfile;
                    } catch (err) {
                        console.warn(`Failed to fetch profile for ${address}:`, err);
                        // Fallback user
                        return {
                            address,
                            name: 'User',
                            birthYear: currentYear,
                            age: 0,
                            gender: '',
                            interests: 'Interests not loaded',
                            photoUrl: '',
                            matchedAt: Date.now(),
                        } as MatchProfile;
                    }
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
