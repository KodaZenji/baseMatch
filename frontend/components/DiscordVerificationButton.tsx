'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';

interface DiscordVerificationButtonProps {
  onVerificationSuccess?: () => void;
}

export default function DiscordVerificationButton({ onVerificationSuccess }: DiscordVerificationButtonProps) {
  const { address } = useAccount();

  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isVerified, setIsVerified] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check Discord verification status from Supabase
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!address) return;

      try {
        const response = await fetch(`/api/profile?address=${address}`);
        const data = await response.json();

        if (data.discord_verified) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, [address]);

  // Listen for callback query params (discord_verified)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('discord_verified');

    if (verified === 'true') {
      setIsVerified(true);
      setShowSuccessMessage(true);
      setStatus('success');
      setMessage('Successfully verified with Discord! You now have the "Early OG" role.');

      // Clean URL after reading params
      window.history.replaceState({}, '', window.location.pathname);

      // Hide success message after a short delay
      setTimeout(() => {
        setShowSuccessMessage(false);
        onVerificationSuccess?.();
      }, 5000);

    } else if (verified === 'false') {
      setStatus('error');
      setMessage('Verification failed. Please try again.');
    }
  }, [onVerificationSuccess]);

  // The professional verification handler
  const handleDiscordVerify = async () => {
    if (!address) {
      setMessage('Please connect your wallet first');
      setStatus('error');
      return;
    }

    setIsVerifying(true);
    setStatus('idle');

    try {
      // 🔐 Generate a secure state tied to this wallet
      const stateResponse = await fetch('/api/discord/generate-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }) // address safely used here
      });

      if (!stateResponse.ok) {
        const data = await stateResponse.json();
        throw new Error(data.error || 'Failed to generate Discord state');
      }

      const { state } = await stateResponse.json();

      // Build Discord OAuth URL
      const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`);
      const scopes = 'identify guilds.join';

      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`;

      // Redirect the user
      window.location.href = discordAuthUrl;

    } catch (error: any) {
      console.error('Discord verification error:', error);
      setMessage(error.message || 'Verification failed. Please try again.');
      setStatus('error');
      setIsVerifying(false);
    }
  };

  // Hide the button if already verified (except temporary success message)
  if (isVerified && !showSuccessMessage) return null;

  return (
    <div className="space-y-4">
      {/* Success notification */}
      {showSuccessMessage && (
        <div className="flex items-start gap-3 p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 shadow-lg animate-fade-in">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 animate-bounce" />
          <div>
            <p className="font-bold text-sm text-green-800 dark:text-green-200">
              Discord Verified!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              You now have the "Early OG" role in our Discord server.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 italic">
              This message will disappear in a few seconds...
            </p>
          </div>
        </div>
      )}

      {/* Discord verification button */}
      {!showSuccessMessage && (
        <button
          onClick={handleDiscordVerify}
          disabled={isVerifying || !address}
          className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <FaDiscord className="w-5 h-5" />
              <span>Verify with Discord</span>
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {message && status === 'error' && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Requirements info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Requirements for "Early OG" Role
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">✓</span>
            <span>BaseMatch profile created</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">✓</span>
            <span>Farcaster account linked</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
