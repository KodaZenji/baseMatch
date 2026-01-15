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
        // Check if already verified in profile
        if (profile?.discord_verified) {
          setIsVerified(true);
          setIsLoading(false);
          return;
        }

        // Check URL for fresh verification
        const urlParams = new URLSearchParams(window.location.search);
        const verified = urlParams.get('discord_verified');
        
        if (verified === 'true') {
          setIsVerified(true);
          setShowSuccess(true);
          
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
          
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
  }, [address, profile]);

  // Check if user can verify (needs Farcaster verification)
  const canVerify = profile?.farcaster_verified || false;

  return { isVerified, showSuccess, isLoading, canVerify };
}
