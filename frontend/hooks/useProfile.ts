import { useAccount, useReadContract } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface DatabaseProfile {
  farcaster_verified?: boolean;
  farcaster_fid?: string;
  discord_verified?: boolean;
  discord_user_id?: string;
}

export function useProfile(address?: string) {
    const { address: connectedAddress, isConnected } = useAccount();
    const effectiveAddress = address || connectedAddress;
    const queryClient = useQueryClient();
    const [dbProfile, setDbProfile] = useState<DatabaseProfile | null>(null);

    // Fetch blockchain profile
    const { data: profileData, error, isLoading, refetch } = useReadContract({
        address: CONTRACTS.PROFILE_NFT as `0x${string}`,
        abi: PROFILE_NFT_ABI,
        functionName: 'getProfile',
        args: effectiveAddress ? [effectiveAddress as `0x${string}`] : undefined,
        query: {
            enabled: isConnected && !!effectiveAddress,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
        }
    });

    // Fetch database profile for verification statuses
    useEffect(() => {
        if (!effectiveAddress) return;

        const fetchDbProfile = async () => {
            try {
                const response = await fetch('/api/profile/get', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: effectiveAddress }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setDbProfile({
                        farcaster_verified: data.profile?.farcaster_verified,
                        farcaster_fid: data.profile?.farcaster_fid,
                        discord_verified: data.profile?.discord_verified,
                        discord_user_id: data.profile?.discord_user_id,
                    });
                }
            } catch (err) {
                console.error('Error fetching DB profile:', err);
            }
        };

        fetchDbProfile();
    }, [effectiveAddress]);

    if (error) {
        console.error('Error fetching profile:', error);
    }

    // Merge blockchain + database data
    const profile = profileData ? {
        tokenId: (profileData as any).tokenId,
        name: (profileData as any).name,
        birthYear: (profileData as any).birthYear,
        gender: (profileData as any).gender,
        interests: (profileData as any).interests,
        photoUrl: (profileData as any).photoUrl,
        email: (profileData as any).email,
        wallet_address: (profileData as any).walletAddress || effectiveAddress,
        exists: (profileData as any).exists,
        // Add database fields
        farcaster_verified: dbProfile?.farcaster_verified,
        farcaster_fid: dbProfile?.farcaster_fid,
        discord_verified: dbProfile?.discord_verified,
        discord_user_id: dbProfile?.discord_user_id,
    } : null;

    const refreshProfile = async () => {
        await queryClient.invalidateQueries({ queryKey: ['readContract'] });
        await refetch();
        // Refresh DB profile too
        if (effectiveAddress) {
            const response = await fetch('/api/profile/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: effectiveAddress }),
            });
            if (response.ok) {
                const data = await response.json();
                setDbProfile({
                    farcaster_verified: data.profile?.farcaster_verified,
                    farcaster_fid: data.profile?.farcaster_fid,
                    discord_verified: data.profile?.discord_verified,
                    discord_user_id: data.profile?.discord_user_id,
                });
            }
        }
    };

    const isAbiMismatchError = error && (
        error.message.includes('InvalidBytesBooleanError') ||
        error.message.includes('Bytes value') ||
        error.message.includes('mismatch')
    );

    return {
        profile,
        isLoading,
        error,
        hasProfile: profile?.exists || false,
        refreshProfile,
        isAbiMismatchError,
    };
}
