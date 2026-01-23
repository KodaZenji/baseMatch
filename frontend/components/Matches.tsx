'use client';

import { useAccount } from 'wagmi';
import { MATCHING_ABI, CONTRACTS, PROFILE_NFT_ABI } from '@/lib/contracts';
import ProfileCard from './ProfileCard';
import { useEffect, useState } from 'react';
import { useWriteContract, useReadContract } from '@/hooks/useContracts';

interface MatchProfile {
    address: string;
    name: string;
    birthYear: number;
    gender: string;
    interests: string;
    photoUrl: string;
    age?: number; // calculated
}

export default function Matches() {
    const { address } = useAccount();
    const [matches, setMatches] = useState<MatchProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const { readContract } = useReadContract();
    const { writeContract, isPending } = useWriteContract();

    useEffect(() => {
        if (!address) return;

        const fetchMatches = async () => {
            setLoading(true);
            try {
                // Get matched addresses from the smart contract
                const matchedAddresses: string[] = await readContract({
                    address: CONTRACTS.MATCHING as `0x${string}`,
                    abi: MATCHING_ABI,
                    functionName: 'getMatches',
                    args: [address as `0x${string}`],
                });

                // Fetch profile data for each matched address
                const profiles: MatchProfile[] = await Promise.all(
                    matchedAddresses.map(async (userAddress) => {
                        const profileData = await readContract({
                            address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                            abi: PROFILE_NFT_ABI,
                            functionName: 'getProfile',
                            args: [userAddress as `0x${string}`],
                        });

                        const birthYear = Number(profileData.birthYear);
                        const age = new Date().getFullYear() - birthYear;

                        return {
                            address: userAddress,
                            name: profileData.name,
                            birthYear,
                            gender: profileData.gender,
                            interests: profileData.interests,
                            photoUrl: profileData.photoUrl,
                            age, // calculated age
                        };
                    })
                );

                setMatches(profiles);
            } catch (err) {
                console.error('Failed to fetch matches:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [address, readContract]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                Loading matches...
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No matches yet. Start expressing interest!
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((profile) => (
                <ProfileCard
                    key={profile.address}
                    profile={profile} // age is now included
                    onExpressInterest={() => console.log('Express interest', profile.address)}
                    isPending={isPending}
                />
            ))}
        </div>
    );
}
