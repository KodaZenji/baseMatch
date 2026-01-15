// frontend/hooks/useDiscordVerification.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';

export function useDiscordVerification() {
  const { address } = useAccount();
  const { profile, refreshProfile } = useProfile(address); // ← Get refreshProfile separately
  const [isVerified, setIsVerified] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAndHandleVerification = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if already verified in profile
        if (profile?.discord_verified) {
          setIsVerified(true);
          setIsLoading(false);
          return;
        }

        // Check URL for fresh verification
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('discord_success');
        
        if (success === 'true') {
          setIsVerified(true);
          setShowSuccess(true);
          
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
          
          // Refresh profile to get latest verification status
          if (refreshProfile) {
            await refreshProfile();
          }
          
          // Hide success after 5 seconds
          setTimeout(() => {
            setShowSuccess(false);
          }, 5000);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking verification:', error);
        setIsLoading(false);
      }
    };

    checkAndHandleVerification();
  }, [address, profile?.discord_verified, refreshProfile]);

  // Check if user can verify (needs Farcaster verification)
  const canVerify = Boolean(profile?.farcaster_verified && !profile?.discord_verified);

  return { 
    isVerified: profile?.discord_verified || false, 
    showSuccess, 
    isLoading, 
    canVerify 
  };
}
