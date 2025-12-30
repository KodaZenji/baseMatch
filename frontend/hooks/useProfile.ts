// hooks/useProfile.ts

import { useAccount, useReadContract } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { useQueryClient } from '@tanstack/react-query';

export function useProfile(address?: string) {
    // If no address provided, use the connected wallet address
    const { address: connectedAddress, isConnected } = useAccount();
    const effectiveAddress = address || connectedAddress;
    const queryClient = useQueryClient();

    const { data: profileData, error, isLoading, refetch } = useReadContract({
        address: CONTRACTS.PROFILE_NFT as `0x${string}`,
        abi: PROFILE_NFT_ABI,
        functionName: 'getProfile',
        args: effectiveAddress ? [effectiveAddress as `0x${string}`] : undefined, // Only call if address exists
        query: {
            enabled: isConnected && !!effectiveAddress, // Only run query if connected and has address
            refetchOnMount: true, // Always refetch when component mounts
            refetchOnWindowFocus: true, // Refetch when window regains focus
        }
    });

    // Log errors
    if (error) {
        console.error('Error fetching profile:', error);
    }

    // Parse profile data - it returns as a tuple/struct
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
    } : null;

    // Log profile data with BigInt handling
    if (profileData) {
        // Use a custom replacer to handle BigInt values
        const profileString = JSON.stringify(profileData, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        console.log('Profile data received:', profileString);
    }

    // Function to manually refetch profile
    const refreshProfile = async () => {
        await queryClient.invalidateQueries({ queryKey: ['readContract'] });
        await refetch();
    };

    // Check if error is related to ABI mismatch
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
