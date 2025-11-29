import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';

interface Profile {
    address: string;
    name: string;
    age: number;
    gender: string;
    interests: string;
    photoUrl: string;
    reputation?: {
        totalDates: number;
        noShows: number;
        averageRating: number;
    };
}

// For fetching profiles from Supabase database
// In production, you could also use a subgraph or blockchain events indexer

export function useProfiles() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.PROFILE_NFT && CONTRACTS.PROFILE_NFT.startsWith('0x') && CONTRACTS.PROFILE_NFT.length === 42;

    // Fetch profiles from blockchain
    useEffect(() => {
        if (!isContractDeployed) {
            setProfiles([]);
            setLoading(false);
            return;
        }

        const fetchProfiles = async () => {
            try {
                setLoading(true);

                // Fetch profiles from Supabase
                const response = await fetch('/api/profiles');
                if (!response.ok) {
                    throw new Error('Failed to fetch profiles');
                }

                const data = await response.json();
                const fetchedProfiles: Profile[] = (data.profiles || []).map((profile: any) => ({
                    address: profile.address,
                    name: profile.name || '',
                    age: profile.age || 0,
                    gender: profile.gender || '',
                    interests: profile.interests || '',
                    photoUrl: profile.photoUrl || '',
                }));

                setProfiles(fetchedProfiles);
            } catch (error) {
                console.error('Error fetching profiles:', error);
                setProfiles([]);
            } finally {
                setLoading(false);
            }
        };

        // Fetch with a small delay to allow for debouncing
        const timer = setTimeout(fetchProfiles, 500);
        return () => clearTimeout(timer);
    }, [isContractDeployed]);

    return { profiles, loading };
}