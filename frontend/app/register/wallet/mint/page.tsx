'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCapabilities } from 'wagmi/experimental';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { base } from 'wagmi/chains';

const TX_TIMEOUT = 90000;

export default function WalletMintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const { data: availableCapabilities } = useCapabilities({ account: address });

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 1_000,
  });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [mintStep, setMintStep] = useState<'idle' | 'signing' | 'confirming' | 'success' | 'failed'>('idle');
  const [canRetry, setCanRetry] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [paymasterAvailable, setPaymasterAvailable] = useState(false);

  useEffect(() => {
    if (availableCapabilities && availableCapabilities[base.id]) {
      const capabilities = availableCapabilities[base.id];
      const hasPaymaster = capabilities?.paymasterService?.supported || false;
      setPaymasterAvailable(hasPaymaster);
    }
  }, [availableCapabilities]);

  useEffect(() => {
    if (isPending) {
      setMintStep('signing');
      setCanRetry(false);
    } else if (isConfirming && hash) {
      setMintStep('confirming');
    } else if (isSuccess) {
      setMintStep('success');
    }
  }, [isPending, isConfirming, isSuccess, hash]);

  useEffect(() => {
    if (hash && isConfirming && !isSuccess) {
      const timer = setTimeout(() => {
        setError('Transaction is taking longer than expected. Check BaseScan or wait a bit more.');
        setCanRetry(false);
      }, TX_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [hash, isConfirming, isSuccess]);

  useEffect(() => {
    const err = writeError || confirmError;
    if (err) {
      const msg = err.message || 'Transaction failed';
      if (msg.includes('User rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled. Click "Retry Mint" to try again.');
      } else if (msg.includes('insufficient funds')) {
        setError('Insufficient ETH for gas fees. Please add ETH to your wallet.');
      } else {
        setError(msg);
      }
      setMintStep('failed');
      setCanRetry(true);
    }
  }, [writeError, confirmError]);

  useEffect(() => {
    if (!address) {
      setIsCheckingStatus(false);
      return;
    }

    const checkAndRecover = async () => {
      setIsCheckingStatus(true);
      try {
        const statusRes = await fetch('/api/profile/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const status = await statusRes.json();

        if (statusRes.ok && status.profileExists && status.source === 'blockchain') {
          localStorage.removeItem('walletFirstMint');
          router.push('/');
          return;
        }

        const storedData = localStorage.getItem('walletFirstMint');
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            setMintData(data);
            setError('');
            setIsCheckingStatus(false);
            return;
          } catch {
            localStorage.removeItem('walletFirstMint');
          }
        }

        if (status.profileExists && status.source === 'database' && !status.hasNFT) {
          const profileRes = await fetch('/api/profile/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });

          if (profileRes.ok) {
            const { profile } = await profileRes.json();
            if (profile && profile.wallet_address) {
              const recoveredData = {
                profile_id: profile.id,
                id: profile.id,
                address: profile.wallet_address,
                email: profile.email,
                registerWithWalletPayload: {
                  name: profile.name,
                  birthYear: profile.birthYear,
                  gender: profile.gender,
                  interests: profile.interests,
                  photoUrl: profile.photoUrl || '',
                },
                contractAddress: CONTRACTS.PROFILE_NFT,
              };
              localStorage.setItem('walletFirstMint', JSON.stringify(recoveredData));
              setMintData(recoveredData);
              setError('');
              setRecoveryAttempted(true);
            } else {
              throw new Error('Profile data incomplete');
            }
          } else {
            throw new Error('Profile data not found in database');
          }
        } else {
          setError('Registration data not found. Please complete your profile first.');
        }
        setIsCheckingStatus(false);
      } catch (err) {
        console.error('❌ Status check failed:', err);
        setError('Failed to load registration data. Please try again.');
        setIsCheckingStatus(false);
      }
    };

    checkAndRecover();
  }, [address]);

  // Redirect after success
  useEffect(() => {
    if (isSuccess && hash) {
      const timer = setTimeout(async () => {
        try {
          await fetch('/api/profile/update-nft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, txHash: hash, profileId: mintData?.profile_id }),
          });
        } catch {}
        localStorage.removeItem('walletFirstMint');
        router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash, address, mintData, router]);

  const handleMint = async () => {
    if (!address || !mintData) return;
    setError('');
    try {
      writeContract({
        address: mintData.contractAddress || CONTRACTS.PROFILE_NFT,
        abi: PROFILE_NFT_ABI,
        functionName: 'mintProfile',
        args: [
          mintData.registerWithWalletPayload.name,
          mintData.registerWithWalletPayload.birthYear,
          mintData.registerWithWalletPayload.gender,
          mintData.registerWithWalletPayload.interests,
          mintData.registerWithWalletPayload.photoUrl || '',
        ],
      });
    } catch {
      setError('Failed to initiate mint. Please try again.');
      setMintStep('failed');
      setCanRetry(true);
    }
  };

  const handleRetry = () => {
    reset();
    setError('');
    setMintStep('idle');
    setCanRetry(false);
    handleMint();
  };

  function MintStepIndicator() {
    const steps = [
      { id: 'signing',    label: 'Waiting for wallet signature' },
      { id: 'confirming', label: 'Confirming on blockchain'     },
      { id: 'success',    label: 'Profile minted!'              },
    ];
    return (
      <div className="space-y-3 mb-6">
        {steps.map(({ id, label }) => {
          const isActive  = mintStep === id;
          const isDone    = mintStep === 'success' && id !== 'success' ? true
                          : id === 'signing'    && (mintStep === 'confirming' || mintStep === 'success')
                          : id === 'confirming' && mintStep === 'success';
          return (
            <div key={id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              isActive ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                       : isDone  ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                 : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }`}>
              {isActive ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
              ) : isDone ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
              )}
              <span className={`text-sm font-medium ${
                isActive ? 'text-blue-700 dark:text-blue-300'
                         : isDone ? 'text-green-700 dark:text-green-300'
                                  : 'text-gray-400 dark:text-gray-500'
              }`}>{label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Logo helper ───────────────────────────────────────────────────────────────
  const LogoBlock = () => (
    <div className="flex justify-center mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
        <img src="/bmg_new_logo.png" alt="BaseMatch" className="w-12 h-12 object-contain" />
      </div>
    </div>
  );

  // ============================================
  // LOADING / CHECKING STATE
  // ============================================
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <LogoBlock />
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking registration status...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // NOT CONNECTED
  // ============================================
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <LogoBlock />
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">Please connect your wallet to mint your profile</p>
          <div className="mb-4">
            <ConnectButton />
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // NO MINT DATA
  // ============================================
  if (!mintData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <LogoBlock />
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error || 'No registration data found'}</p>
          <button
            onClick={() => router.push('/register/wallet/complete')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN MINT SCREEN
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center border border-gray-200 dark:border-gray-700">
        <LogoBlock />

        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          BaseMatch
        </h1>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {recoveryAttempted && !error && (
          <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg mb-6">
            ✅ Profile data recovered from database successfully!
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
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  This will create your on-chain profile.
                </p>
              </>
            )}

            {/* Preview */}
            {mintData?.registerWithWalletPayload && mintStep === 'idle' && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Profile Preview:</p>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-medium">Name:</span> {mintData.registerWithWalletPayload.name}</p>
                  <p><span className="font-medium">Age:</span> {new Date().getFullYear() - mintData.registerWithWalletPayload.birthYear}</p>
                  <p><span className="font-medium">Gender:</span> {mintData.registerWithWalletPayload.gender}</p>
                  {mintData.registerWithWalletPayload.photoUrl && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium">Avatar:</span>
                      <img
                        src={mintData.registerWithWalletPayload.photoUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mint Button */}
            <button
              onClick={canRetry ? handleRetry : handleMint}
              disabled={isPending || isConfirming || (mintStep !== 'idle' && mintStep !== 'failed')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {canRetry && <RefreshCw className="w-5 h-5" />}
              {isPending ? 'Waiting for signature...' :
               isConfirming ? 'Confirming on blockchain...' :
               canRetry ? 'Retry Mint' : '✨ Mint Profile NFT'}
            </button>

            {mintStep === 'idle' && (
              <button
                onClick={() => router.push('/register/wallet/complete')}
                className="w-full mt-4 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors shadow-md"
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
