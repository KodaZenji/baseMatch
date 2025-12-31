'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

export default function MintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ 
    hash,
    pollingInterval: 1_000, // Poll every 1 second with Alchemy RPC
  });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [txHash, setTxHash] = useState<string>('');

  // Memoized sync function
  const syncProfileWithWallet = useCallback(async (walletAddress: string): Promise<boolean> => {
    setIsSyncing(true);

    const emailFirstReg = localStorage.getItem('emailFirstMint');

    if (emailFirstReg) {
      try {
        const data = JSON.parse(emailFirstReg);
        const profile_id = data.profileId || data.profile_id || data.id;

        if (!profile_id) {
          console.error("❌ Profile ID missing");
          setError('Profile ID missing. Please contact support.');
          setIsSyncing(false);
          return false;
        }

        console.log('🔄 Syncing wallet to profile...');
        const response = await fetch('/api/link-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile_id,
            wallet_address: walletAddress,
            name: data.registerWithEmailPayload?.name,
            birthYear: data.registerWithEmailPayload?.birthYear,
            gender: data.registerWithEmailPayload?.gender,
            interests: data.registerWithEmailPayload?.interests,
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          console.error('❌ Failed to sync wallet:', responseData);
          setError(`Mint successful, but failed to sync wallet: ${responseData.error || 'Unknown error'}`);
          setIsSyncing(false);
          return false;
        }

        console.log('✅ Successfully synced wallet to profile');
        setIsSyncing(false);
        return true;

      } catch (e) {
        console.error("❌ Error syncing profile:", e);
        setError('Mint successful, but internal error syncing profile.');
        setIsSyncing(false);
        return false;
      }
    }

    setIsSyncing(false);
    return true; // For wallet-first flow
  }, []);

  // Check profile status
  useEffect(() => {
    if (!address) {
      setIsCheckingStatus(false);
      setMintData(null);
      return;
    }

    const checkProfileStatus = async () => {
      setIsCheckingStatus(true);
      setStatusError('');

      try {
        const response = await fetch('/api/profile/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address }),
        });

        const statusData = await response.json();

        if (response.ok && statusData.profileExists) {
          console.log('✅ Profile already exists. Redirecting...');
          router.push('/');
          return;
        }

        // Load minting payload
        const walletReg = localStorage.getItem('walletRegistration');
        const emailFirstReg = localStorage.getItem('emailFirstMint');
        const regString = walletReg || emailFirstReg;

        if (regString) {
          try {
            const data = JSON.parse(regString);
            setMintData(data);
            setError('');
            console.log('📋 Loaded mint data');
          } catch (e) {
            setError('Corrupted registration data found.');
          }
        } else {
          setError('No registration data found. Please register first.');
        }

      } catch (err) {
        console.error("❌ Profile status check failed:", err);
        setStatusError('Failed to check profile status. Please try again.');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkProfileStatus();
  }, [address, router]);

  // Handle successful mint
  useEffect(() => {
    if (!isSuccess || !address || isSyncing) return;

    const handlePostMintSync = async () => {
      console.log('🎉 Mint transaction confirmed!');

      const syncSuccess = await syncProfileWithWallet(address);

      if (syncSuccess) {
        console.log('✅ Sync completed, cleaning up...');
        
        // Clear registration data
        localStorage.removeItem('walletRegistration');
        localStorage.removeItem('emailFirstMint');

        // Immediate redirect
        router.push('/');
      } else {
        console.error('❌ Sync failed');
      }
    };

    handlePostMintSync();
  }, [isSuccess, address, isSyncing, router, syncProfileWithWallet]);

  // Track transaction hash
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      console.log('📝 Transaction hash:', hash);
      console.log('🔗 View on BaseScan:', `https://basescan.org/tx/${hash}`);
    }
  }, [hash]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      console.error('❌ Write contract error:', writeError);
      setError(writeError.message || 'Transaction failed');
      setIsMinting(false);
    }
  }, [writeError]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('❌ Receipt error:', receiptError);
      setError('Transaction receipt error. Please check BaseScan.');
      setIsMinting(false);
    }
  }, [receiptError]);

  const handleMint = async () => {
    if (!mintData?.createProfilePayload && !mintData?.registerWithEmailPayload) {
      setError('No minting payload available');
      return;
    }

    setError('');
    setIsMinting(true);

    try {
      console.log('🚀 Starting mint transaction...');
      
      if (mintData.useRegisterWithEmail) {
        // Email-first flow
        const payload = mintData.registerWithEmailPayload;
        console.log('📧 Using registerWithEmail function');
        
        writeContract({
          address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
          abi: PROFILE_NFT_ABI,
          functionName: 'registerWithEmail',
          args: [payload.name, payload.birthYear, payload.gender, payload.interests, payload.email],
        });
      } else {
        // Wallet-first flow
        const payload = mintData.createProfilePayload;
        console.log('👛 Using createProfile function');
        
        writeContract({
          address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
          abi: PROFILE_NFT_ABI,
          functionName: 'createProfile',
          args: [payload.name, payload.birthYear, payload.gender, payload.interests, payload.photoUrl],
        });
      }
    } catch (err) {
      console.error('❌ Mint error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint profile');
      setIsMinting(false);
    }
  };

  // Loading state
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-3 shadow-lg">
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
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-700 text-lg">Checking profile status...</p>
          {statusError && <p className="text-red-500 mt-2 text-sm">{statusError}</p>}
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-3 shadow-lg">
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
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-700 mb-6">Please connect your wallet to mint your profile</p>
          <ConnectButton />
          <button onClick={() => router.push('/')} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No mint data
  if (!mintData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-3 shadow-lg">
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
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>
          <p className="text-gray-700 mb-6">{error || 'Loading...'}</p>
          <button onClick={() => router.push('/')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main mint screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full p-3 shadow-lg">
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

        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          BaseMatch
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isSuccess || isSyncing ? (
          <div className="text-center py-8">
            {isSyncing ? (
              <>
                <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-700 text-lg font-semibold">⏳ Finalizing profile...</p>
                <p className="text-gray-500 text-sm mt-2">Syncing your profile data</p>
              </>
            ) : (
              <>
                <p className="text-6xl mb-4">🎉</p>
                <p className="text-gray-700 text-xl font-bold mb-2">Profile Created!</p>
                <p className="text-gray-500 text-sm">Redirecting to your profile...</p>
                {txHash && (
                  <a 
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs mt-2 inline-block"
                  >
                    View transaction ↗
                  </a>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-700 mb-6">Ready to mint your BaseMatch profile NFT?</p>
            
            {/* Transaction Status */}
            {(isPending || isConfirming) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                {isPending && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-700 font-semibold">Confirm transaction in your wallet</span>
                  </div>
                )}
                {isConfirming && (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-blue-700 font-semibold">⛓️ Waiting for confirmation...</span>
                    </div>
                    {txHash && (
                      <a 
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View on BaseScan ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Confirm in wallet...
                </span>
              ) : isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Confirming on blockchain...
                </span>
              ) : (
                '✨ Mint Profile NFT'
              )}
            </button>
            
            <button
              onClick={() => router.push('/')}
              disabled={isPending || isConfirming}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
