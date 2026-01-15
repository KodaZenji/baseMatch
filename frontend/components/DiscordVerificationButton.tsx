// frontend/components/DiscordVerificationButton.tsx
'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader, AlertCircle as AlertIcon } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { useDiscordVerification } from '@/hooks/useDiscordVerification';
import { useAccount } from 'wagmi';

export default function DiscordVerificationButton() {
  const { address } = useAccount();
  const { isVerified, showSuccess, canVerify, isLoading } = useDiscordVerification();
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!canVerify) {
      setError('Please verify your Farcaster account first');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      // Step 1: Generate secure state token
      const stateResponse = await fetch('/api/discord/generate-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!stateResponse.ok) {
        const errorData = await stateResponse.json();
        throw new Error(errorData.error || 'Failed to generate verification token');
      }

      const { state } = await stateResponse.json();

      // Step 2: Redirect to Discord OAuth
      const redirectUri = encodeURIComponent(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`
      );
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds.join&state=${state}`;
      
      window.location.href = discordAuthUrl;
    } catch (err: any) {
      console.error('Discord verification error:', err);
      setError(err.message || 'Discord verification failed');
      setIsVerifying(false);
    }
  };

  // ✅ Show verified state
  if (isVerified) {
    return (
      <div className="flex items-start gap-3 p-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-lg animate-fade-in">
        <CheckCircle className="w-8 h-8 text-green-600 animate-bounce" />
        <div>
          <p className="font-bold text-lg text-green-800">Discord Verified!</p>
          <p className="text-sm text-green-700 mt-1">
            You now have the "Early OG" role
          </p>
        </div>
      </div>
    );
  }

  // 🎉 Show success message (temporary, before page reloads)
  if (showSuccess) {
    return (
      <div className="flex items-start gap-3 p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg animate-fade-in">
        <CheckCircle className="w-8 h-8 text-blue-600 animate-bounce" />
        <div>
          <p className="font-bold text-lg text-blue-800">Verification Successful!</p>
          <p className="text-sm text-blue-700 mt-1">
            Processing your "Early OG" role...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleVerify}
        disabled={isLoading || isVerifying || !address || !canVerify}
        className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading || isVerifying ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>{isVerifying ? 'Opening Discord...' : 'Checking...'}</span>
          </>
        ) : (
          <>
            <FaDiscord className="w-5 h-5" />
            <span>Verify with Discord</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!canVerify && !error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertIcon className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Farcaster Required</p>
            <p>Missing a step, kindly go to "Edit Profile" and link a Farcaster account</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Requirements for "Early OG" Role
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>BaseMatch profile created</span>
          </li>
          <li className="flex items-start gap-2">
            <span className={canVerify ? "text-green-500" : "text-blue-500"}>
              {canVerify ? "✓" : "○"}
            </span>
            <span className={canVerify ? "font-semibold" : ""}>
              Farcaster account linked {!canVerify && "(Required)"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
