'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface FarcasterVerificationSectionProps {
  hasWallet: boolean;
  farcasterVerified: boolean;
  onVerificationComplete: () => void;
  walletAddress: string;
}

export default function FarcasterVerificationSection({
  hasWallet,
  farcasterVerified,
  onVerificationComplete,
  walletAddress,
}: FarcasterVerificationSectionProps) {
  const [step, setStep] = useState<'initial' | 'input' | 'confirm'>('initial');
  const [fid, setFid] = useState('');
  const [username, setUsername] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // NEW
  const [lockedOut, setLockedOut] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  if (!hasWallet) return null;

  if (farcasterVerified) {
    return (
      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Farcaster Verified ✓</span>
        </div>
        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
          Your Farcaster badge is active!
        </p>
      </div>
    );
  }

  // NEW — Pre-check before verify
  const checkRateLimit = async () => {
    try {
      const res = await fetch('/api/check-farcaster-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });

      const data = await res.json();

      if (!data.allowed) {
        setLockMessage(data.reason || 'Too many attempts. Try again later.');
        setLockedOut(true);
        return false;
      }

      if (data.attemptsLeft !== undefined) {
        setAttemptsLeft(data.attemptsLeft);
      }

      return true;
    } catch (err) {
      console.error('Rate limit check failed:', err);
      return true; // allow if check fails
    }
  };

  const handleVerify = async () => {
    if (!fid || !username) {
      setError('Please enter both FID and username');
      return;
    }

    setError('');

    // NEW check
    const allowed = await checkRateLimit();
    if (!allowed) return;

    setIsVerifying(true);

    try {
      const response = await fetch('/api/verify-farcaster-fid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          fid: fid.trim(),
          username: username.trim().toLowerCase().replace('@', ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');

        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }

        if (data.lockedOut) {
          setLockMessage(data.reason || 'Too many attempts.');
          setLockedOut(true);
        }

        setIsVerifying(false);
        return;
      }

      if (data.verified) {
        setFarcasterProfile(data.profile);
        setStep('confirm');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhotoChoice = async (usePhoto: boolean) => {
    setIsVerifying(true);

    try {
      const response = await fetch('/api/update-farcaster-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          usePhoto,
          photoUrl: usePhoto ? farcasterProfile.pfp : null,
        }),
      });

      if (response.ok) {
        onVerificationComplete();
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      setError('Failed to update photo');
      setIsVerifying(false);
    }
  };

  // NEW LOCK MODAL
  if (lockedOut) {
    return (
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/40 z-50">
        <div className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 rounded-xl p-6 w-80 border border-neutral-300 dark:border-neutral-700">
          <h3 className="font-semibold text-lg mb-2">Verification Paused</h3>
          <p className="text-sm mb-4">{lockMessage}</p>
          <button
            onClick={() => setLockedOut(false)}
            className="w-full py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Confirm photo step
  if (step === 'confirm' && farcasterProfile) {
    return (
      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
        <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-3">
          Profile Found! 🎉
        </h3>

        <div className="bg-white dark:bg-purple-900/20 border border-gray-200 dark:border-purple-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={farcasterProfile.pfp}
              alt="Farcaster"
              className="w-16 h-16 rounded-full border-2 border-purple-200 dark:border-purple-600"
            />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">
                @{farcasterProfile.username}
              </p>
              <p className="text-sm text-gray-600 dark:text-purple-200">
                {farcasterProfile.displayName}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-purple-200 mb-4">
            Would you like to update your profile photo from Farcaster?
          </p>

          <div className="space-y-2">
            <button
              onClick={() => handlePhotoChoice(true)}
              disabled={isVerifying}
              className="w-full py-2 text-white rounded-lg text-sm font-medium transition-all 
                         bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {isVerifying ? 'Updating...' : 'Yes, use Farcaster photo'}
            </button>
            <button
              onClick={() => handlePhotoChoice(false)}
              disabled={isVerifying}
              className="w-full py-2 text-purple-700 dark:text-white bg-white dark:bg-purple-700 
                         border border-purple-300 dark:border-purple-600 rounded-lg text-sm font-medium 
                         hover:bg-purple-50 dark:hover:bg-purple-600 disabled:opacity-50 transition-all"
            >
              {isVerifying ? 'Updating...' : 'No, keep current photo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default entry form
  return (
    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
      <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
        Got a Farcaster account? 
      </label>

      <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
        Enter your FID and username to verify your Farcaster account 
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
          {attemptsLeft !== null && (
            <p className="text-xs mt-1">Attempts remaining: {attemptsLeft}/3</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
            Your Farcaster FID
          </label>
          <input
            type="text"
            value={fid}
            onChange={(e) => setFid(e.target.value)}
            placeholder="e.g., 12345"
            className="w-full px-4 py-2 bg-white dark:bg-purple-700 text-gray-900 dark:text-purple-100 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
            Your Farcaster Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., username"
            className="w-full px-4 py-2 bg-white dark:bg-purple-700 text-gray-900 dark:text-purple-100 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Enter without the @ symbol
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || !fid || !username}
          className="w-full py-2 text-white rounded-lg text-sm font-medium transition-all 
                     bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify Farcaster'}
        </button>
      </div>

      <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
        <a
          href="https://warpcast.com/~/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-purple-800 dark:hover:text-purple-200 underline transition-colors"
        >
          Find your FID in Farcaster settings →
        </a>
      </div>
    </div>
  );
}
