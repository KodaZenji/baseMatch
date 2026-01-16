'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart, Loader2, CheckCircle } from 'lucide-react';

export default function WalletMintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ 
    hash,
    pollingInterval: 1_000, // Poll every 1 second - KEY OPTIMIZATION
  });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [mintStep, setMintStep] = useState<'idle' | 'signing' | 'confirming' | 'success'>('idle');

  // Track minting progress
  useEffect(() => {
    if (isPending) {
      setMintStep('signing');
    } else if (isConfirming) {
      setMintStep('confirming');
    } else if (isSuccess) {
      setMintStep('success');
    }
  }, [isPending, isConfirming, isSuccess]);

  // Handle errors
  useEffect(() => {
    if (writeError || confirmError) {
      setError((writeError || confirmError)?.message || 'Transaction failed');
      setIsMinting(false);
      setMintStep('idle');
    }
  }, [writeError, confirmError]);

  // --- EFFECT: Check Profile Status and Load Data ---
  useEffect(() => {
    if (!address) {
      setIsCheckingStatus(false);
      setMintData(null);
      return;
    }

    const checkAndLoadData = async () => {
      setIsCheckingStatus(true);

      try {
        // Check if the user already has an NFT
        const response = await fetch('/api/profile/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });

        const statusData = await response.json();
        console.log('📊 Profile status:', statusData);

        // Only redirect if they have an NFT on blockchain
        if (response.ok && statusData.profileExists && statusData.source === 'blockchain') {
          console.log('✅ User already has NFT, redirecting to dashboard');
          router.push('/');
          return;
        }

        // Load wallet registration data from localStorage
        const walletReg = localStorage.getItem('walletFirstMint');

        if (walletReg) {
          const data = JSON.parse(walletReg);
          console.log('✅ Loaded wallet mint data:', data);
          setMintData(data);
          setError('');
        } else {
          console.error('❌ No wallet registration data found');
          setError('No registration data found. Please complete your profile first.');
        }

      } catch (err) {
        console.error('❌ Error checking status:', err);
        setError('Failed to check profile status. Please try again.');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkAndLoadData();
  }, [address, router]);

  // --- EFFECT: Handle Successful Mint ---
  useEffect(() => {
    if (isSuccess && address) {
      console.log('🎉 Mint successful!');

      // Clear registration data
      localStorage.removeItem('walletFirstMint');

      // Redirect after a short delay
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        router.push('/');
      }, 2000);
    }
  }, [isSuccess, address, router]);

  // --- MINT HANDLER ---
  const handleMint = async () => {
    if (!mintData?.registerWithWalletPayload) {
      setError('No minting data available');
      return;
    }

    setError('');
    setIsMinting(true);

    try {
      const payload = mintData.registerWithWalletPayload;

      console.log('🚀 Minting with payload:', payload);

      writeContract({
        address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
        abi: PROFILE_NFT_ABI,
        functionName: 'createProfile',
        args: [
          payload.name,
          payload.birthYear,
          payload.gender,
          payload.interests,
          payload.photoUrl || '',
        ],
      });
    } catch (err) {
      console.error('❌ Mint error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint profile');
      setIsMinting(false);
    }
  };

  // --- RENDER HELPERS ---
  const MintStepIndicator = () => (
    <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-6 mb-6 border border-blue-200/30 dark:border-blue-500/20">
      <div className="space-y-4">
        {/* Step 1: Sign Transaction */}
        <div className="flex items-center gap-3">
          {mintStep === 'signing' ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : mintStep === 'confirming' || mintStep === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <span className={`font-medium ${mintStep === 'signing' ? 'text-blue-600 dark:text-blue-400' : mintStep === 'confirming' || mintStep === 'success' ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
            Sign transaction in wallet
          </span>
        </div>

        {/* Step 2: Confirming on blockchain */}
        <div className="flex items-center gap-3">
          {mintStep === 'confirming' ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : mintStep === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <span className={`font-medium ${mintStep === 'confirming' ? 'text-blue-600 dark:text-blue-400' : mintStep === 'success' ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
            Confirming on blockchain
          </span>
        </div>

        {/* Step 3: Success */}
        <div className="flex items-center gap-3">
          {mintStep === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <span className={`font-medium ${mintStep === 'success' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'}`}>
            Profile created!
          </span>
        </div>
      </div>

      {hash && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View on BaseScan →
          </a>
        </div>
      )}
    </div>
  );

  // --- RENDER LOGIC ---

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>

          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
            <p className="text-gray-700 dark:text-gray-300 text-lg">Checking profile status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>

          <p className="text-gray-700 dark:text-gray-300 mb-6">Please connect your wallet to mint your profile</p>
          <div className="mb-4">
            <ConnectButton />
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!mintData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>

          <p className="text-gray-700 dark:text-gray-300 mb-6">{error || 'No registration data found'}</p>
          <button
            onClick={() => router.push('/register/wallet/complete')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  // Main mint screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center border border-gray-200 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            <Heart className="w-12 h-12" fill="url(#brandGradient)" stroke="none" />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          BaseMatch
        </h1>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">🎉</p>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-semibold mb-2">Profile minted successfully!</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting to dashboard...</p>
            {hash && (
              <a
                href={`https://basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block"
              >
                View transaction ↗
              </a>
            )}
          </div>
        ) : (
          <div>
            {mintStep !== 'idle' ? (
              <MintStepIndicator />
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Ready to mint your BaseMatch profile NFT?</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This will create your on-chain profile.</p>
              </>
            )}

            {/* Show preview of data being minted */}
            {mintData?.registerWithWalletPayload && mintStep === 'idle' && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Profile Preview:</p>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-medium">Name:</span> {mintData.registerWithWalletPayload.name}</p>
                  <p><span className="font-medium">Age:</span> {new Date().getFullYear() - mintData.registerWithWalletPayload.birthYear}</p>
                  <p><span className="font-medium">Gender:</span> {mintData.registerWithWalletPayload.gender}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Waiting for signature...' : isConfirming ? 'Confirming on blockchain...' : isMinting ? 'Minting...' : '✨ Mint Profile NFT'}
            </button>

            {!isMinting && (
              <button
                onClick={() => router.push('/register/wallet/complete')}
                className="w-full mt-4 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                ← Back to Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
