'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCapabilities, useWriteContracts } from 'wagmi/experimental';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { base } from 'wagmi/chains';

const TX_TIMEOUT = 90000; // 90 seconds for Base mainnet

export default function WalletMintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Check for paymaster capabilities
  const { data: availableCapabilities } = useCapabilities({
    account: address,
  });
  
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  
  // OPTIMIZED: Reduced polling interval from 3s to 1s for faster confirmation
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ 
    hash,
    pollingInterval: 1_000, // 1 second polling
  });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [mintStep, setMintStep] = useState<'idle' | 'signing' | 'confirming' | 'success' | 'failed'>('idle');
  const [canRetry, setCanRetry] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [paymasterAvailable, setPaymasterAvailable] = useState(false);

  // Check if paymaster is available
  useEffect(() => {
    if (availableCapabilities && availableCapabilities[base.id]) {
      const capabilities = availableCapabilities[base.id];
      const hasPaymaster = capabilities?.paymasterService?.supported || false;
      setPaymasterAvailable(hasPaymaster);
      
      if (hasPaymaster) {
        console.log('✅ Paymaster available - Gas-free minting enabled!');
      } else {
        console.log('⚠️ Paymaster not available - User will pay gas');
      }
    }
  }, [availableCapabilities]);

  // Track minting progress
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

  // Transaction timeout handler
  useEffect(() => {
    if (hash && isConfirming && !isSuccess) {
      const timer = setTimeout(() => {
        setError('Transaction is taking longer than expected. Check BaseScan or wait a bit more.');
        setCanRetry(false); // Don't allow retry while tx is still pending
      }, TX_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [hash, isConfirming, isSuccess]);

  // Handle errors
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

  // ============================================
  // CRITICAL: Check status and recover data
  // ============================================
  useEffect(() => {
    if (!address) {
      setIsCheckingStatus(false);
      return;
    }

    const checkAndRecover = async () => {
      setIsCheckingStatus(true);

      try {
        console.log('🔍 Checking profile status for:', address);

        // Step 1: Check if NFT already exists on blockchain
        const statusRes = await fetch('/api/profile/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });

        const status = await statusRes.json();
        console.log('📊 Profile status:', status);

        // If NFT exists on blockchain, redirect to home
        if (statusRes.ok && status.profileExists && status.source === 'blockchain') {
          console.log('✅ NFT already minted, redirecting to dashboard...');
          localStorage.removeItem('walletFirstMint');
          router.push('/');
          return;
        }

        // Step 2: Try to load from localStorage first
        const storedData = localStorage.getItem('walletFirstMint');
        
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            console.log('✅ Loaded mint data from localStorage');
            setMintData(data);
            setError('');
            setIsCheckingStatus(false);
            return;
          } catch (parseError) {
            console.error('❌ Failed to parse localStorage data:', parseError);
            localStorage.removeItem('walletFirstMint');
          }
        }

        // Step 3: CRITICAL - Recover from database if localStorage is missing
        if (status.profileExists && status.source === 'database' && !status.hasNFT) {
          console.log('🔄 No localStorage found, attempting database recovery...');
          
          const profileRes = await fetch('/api/profile/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });

          if (profileRes.ok) {
            const { profile } = await profileRes.json();

            if (profile && profile.wallet_address) {
              console.log('✅ Profile recovered from database:', profile);

              // Reconstruct mint data
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

              // Save back to localStorage
              localStorage.setItem('walletFirstMint', JSON.stringify(recoveredData));
              
              setMintData(recoveredData);
              setError('');
              setRecoveryAttempted(true);
              console.log('✅ Mint data recovered and saved to localStorage');
            } else {
              throw new Error('Profile data incomplete');
            }
          } else {
            throw new Error('Failed to fetch profile from database');
          }
        } else {
          // No profile found anywhere
          setError('No registration data found. Please complete registration first.');
        }

      } catch (err) {
        console.error('❌ Error during status check/recovery:', err);
        setError('Failed to load profile data. Please try registering again or contact support.');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkAndRecover();
  }, [address, router]);

  // Success handler - cleanup and redirect
  useEffect(() => {
    if (isSuccess && address && hash) {
      console.log('🎉 Mint successful! Transaction:', hash);
      localStorage.removeItem('walletFirstMint');
      
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        router.push('/');
      }, 2000);
    }
  }, [isSuccess, address, hash, router]);

  // ============================================
  // MINT HANDLER WITH PAYMASTER SUPPORT
  // ============================================
  const handleMint = async () => {
    if (!mintData?.registerWithWalletPayload) {
      setError('No minting data available. Please complete registration first.');
      return;
    }

    setError('');
    setCanRetry(false);
    reset(); // Clear previous transaction state

    try {
      const payload = mintData.registerWithWalletPayload;

      console.log('🚀 Initiating mint with payload:', {
        name: payload.name,
        birthYear: payload.birthYear,
        gender: payload.gender,
        hasPhoto: !!payload.photoUrl,
        paymasterEnabled: paymasterAvailable,
      });

      // Prepare capabilities for paymaster
      const capabilities: any = {};
      
      if (paymasterAvailable && availableCapabilities?.[base.id]) {
        capabilities.paymasterService = availableCapabilities[base.id].paymasterService;
        console.log('⚡ Using paymaster for gas-free transaction');
      }

      writeContract({
        address: CONTRACTS.PROFILE_NFT as `0x${string}`,
        abi: PROFILE_NFT_ABI,
        functionName: 'createProfile',
        args: [
          payload.name,
          payload.birthYear,
          payload.gender,
          payload.interests,
          payload.photoUrl || '',
        ],
        // Add capabilities if paymaster is available
        ...(paymasterAvailable && { capabilities }),
      });
    } catch (err) {
      console.error('❌ Mint error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate mint transaction');
      setMintStep('failed');
      setCanRetry(true);
    }
  };

  // ============================================
  // RETRY HANDLER
  // ============================================
  const handleRetry = () => {
    console.log('🔄 Retrying mint...');
    setError('');
    setCanRetry(false);
    reset();
    handleMint();
  };

  // ============================================
  // UI COMPONENTS
  // ============================================
  const MintStepIndicator = () => (
    <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-6 mb-6 border border-blue-200/30 dark:border-blue-500/20">
      <div className="space-y-4">
        {/* Step 1: Sign transaction */}
        <div className="flex items-center gap-3">
          {mintStep === 'signing' ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (mintStep === 'confirming' || mintStep === 'success') ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : mintStep === 'failed' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <span className={`font-medium ${
            mintStep === 'signing' ? 'text-blue-600 dark:text-blue-400' : 
            mintStep === 'failed' ? 'text-red-600 dark:text-red-400' :
            (mintStep === 'confirming' || mintStep === 'success') ? 'text-gray-600 dark:text-gray-400' :
            'text-gray-500 dark:text-gray-500'
          }`}>
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
          <span className={`font-medium ${
            mintStep === 'confirming' ? 'text-blue-600 dark:text-blue-400' : 
            mintStep === 'success' ? 'text-gray-600 dark:text-gray-400' :
            'text-gray-500 dark:text-gray-500'
          }`}>
            Confirming on blockchain (~10-15s)
          </span>
        </div>

        {/* Step 3: Profile created */}
        <div className="flex items-center gap-3">
          {mintStep === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <span className={`font-medium ${
            mintStep === 'success' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'
          }`}>
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

  // ── Logo helper ───────────────────────────────────────────────────────────────
  const LogoBlock = () => (
    <div className="flex justify-center mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
        <img src="/bmg_new_logo.png" alt="BaseMatch" className="w-12 h-12 object-contain" />
      </div>
    </div>
  );

  // ============================================
  // LOADING STATE
  // ============================================
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <LogoBlock />
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
                  This will create your on-chain profile{paymasterAvailable ? ' for free!' : '.'}
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
              {paymasterAvailable && mintStep === 'idle' && !canRetry && <Zap className="w-5 h-5" />}
              {isPending ? 'Waiting for signature...' : 
               isConfirming ? 'Confirming on blockchain...' : 
               canRetry ? 'Retry Mint' :
               paymasterAvailable ? '⚡ Mint Profile NFT (Free)' : '✨ Mint Profile NFT'}
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
