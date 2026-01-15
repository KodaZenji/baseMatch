import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';

export function useDiscordVerification() {
  const { address } = useAccount();
  const { profile } = useProfile(address);
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
        // 🎯 Check database verification status
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
          if (profile) {
            await profile.refreshProfile?.();
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
  }, [address, profile?.discord_verified]);

  // 🎯 User can verify if they have Farcaster AND not already verified
  const canVerify = Boolean(profile?.farcaster_verified && !profile?.discord_verified);

  return { 
    isVerified: profile?.discord_verified || false, 
    showSuccess, 
    isLoading, 
    canVerify 
  };
}
