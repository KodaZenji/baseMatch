'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function MintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);

  // Helper function to sync the profile off-chain after a successful mint
  const syncProfileWithWallet = async (walletAddress: string): Promise<boolean> => {
    if (syncAttempted) {
      console.log('⚠️ Sync already attempted, skipping...');
      return false;
    }

    setIsSyncing(true);
    setSyncAttempted(true);

    const emailFirstReg = localStorage.getItem('emailFirstMint');

    console.log('🔍 Checking localStorage for emailFirstMint:', emailFirstReg ? 'Found' : 'Not found');

    if (emailFirstReg) {
      try {
        const data = JSON.parse(emailFirstReg);
        const profile_id = data.profileId || data.profile_id || data.id;

        console.log('🔄 Attempting to sync wallet:', {
          profile_id,
          walletAddress,
          fullData: data
        });

        if (!profile_id) {
          console.error("❌ Profile ID missing in localStorage. Data:", data);
          setError('Profile ID missing. Please contact support.');
          setIsSyncing(false);
          return false;
        }

        console.log('📤 Sending request to /api/link-wallet...');

        // Make the API call with correct snake_case keys
        const response = await fetch('/api/link-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile_id,
            wallet_address: walletAddress,
            name: data.registerWithEmailPayload?.name,
            age: data.registerWithEmailPayload?.age,
            gender: data.registerWithEmailPayload?.gender,
            interests: data.registerWithEmailPayload?.interests,
          }),
        });

        const responseData = await response.json();
        console.log('📡 API Response:', {
          status: response.status,
          ok: response.ok,
          data: responseData
        });

        if (!response.ok) {
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
        setError('Mint successful, but internal error syncing profile. Please contact support.');
        setIsSyncing(false);
        return false;
      }
    } else {
      console.log('ℹ️ No emailFirstMint data - assuming wallet-first flow');
      setIsSyncing(false);
      return true; // For wallet-first flow
    }
  };

  // --- EFFECT 1: Check Profile Status and Load Data ---
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
        // Check if the user is already registered/minted
        const response = await fetch('/api/profile/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address }),
        });

        const statusData = await response.json();

        if (response.ok && statusData.profileExists) {
          console.log('User profile found. Redirecting to dashboard.');
          router.push('/');
          return;
        }

        // Load minting payload from localStorage
        const walletReg = localStorage.getItem('walletRegistration');
        const emailFirstReg = localStorage.getItem('emailFirstMint');
        const regString = walletReg || emailFirstReg;

        if (regString) {
          try {
            const data = JSON.parse(regString);
            setMintData(data);
            setError('');
          } catch (e) {
            setError('Corrupted registration data found.');
          }
        } else {
          setError('No registration data found. Please register first.');
        }

      } catch (err) {
        console.error("Profile status check failed:", err);
        setStatusError('Failed to check profile status. Please try again.');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkProfileStatus();
  }, [address, router]);

  // --- EFFECT 2: Handle Successful Mint and Sync ---
  useEffect(() => {
    const handlePostMintSync = async () => {
      if (isSuccess && mintData && address && !isSyncing && !syncAttempted) {
        console.log('🎉 Mint successful, starting sync process...');

        const syncSuccess = await syncProfileWithWallet(address);

        if (syncSuccess) {
          console.log('✅ Sync completed successfully, cleaning up...');

          // Clear registration data only after successful sync
          localStorage.removeItem('walletRegistration');
          localStorage.removeItem('emailFirstMint');

          // Redirect after a short delay
          setTimeout(() => {
            console.log('🔄 Redirecting to dashboard...');
            router.push('/');
          }, 2000);
        } else {
          console.error('❌ Sync failed, not redirecting automatically');
        }
      }
    };

    handlePostMintSync();
  }, [isSuccess, address]);

  // --- RENDER LOGIC ---

  // 🛑 Status Check Loading Screen
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
            💖 BaseMatch
          </h1>
          <div className="flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700 text-lg">Checking profile status...</p>
            {statusError && <p className="text-red-500 mt-2">{statusError}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Wallet connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
            💖 BaseMatch
          </h1>
          <p className="text-gray-700 mb-6">Please connect your wallet to mint your profile</p>
          <div className="mb-4">
            <ConnectButton />
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Mint Data Payload check
  if (!mintData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
            💖 BaseMatch
          </h1>
          <p className="text-gray-700 mb-6">{error || 'Loading...'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleMint = async () => {
    if (!mintData?.createProfilePayload && !mintData?.mintingPayload && !mintData?.registerWithEmailPayload) {
      setError('No minting payload available');
      return;
    }

    setError('');
    setIsMinting(true);

    try {
      // Determine which function to call
      if (mintData.useRegisterWithEmail) {
        // Email-first flow
        const payload = mintData.registerWithEmailPayload;
        writeContract({
          address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
          abi: PROFILE_NFT_ABI,
          functionName: 'registerWithEmail',
          args: [payload.name, payload.age, payload.gender, payload.interests, payload.email],
        });
      } else {
        // Wallet-first flow
        const payload = mintData.createProfilePayload || mintData.mintingPayload;
        writeContract({
          address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
          abi: PROFILE_NFT_ABI,
          functionName: 'createProfile',
          args: [payload.name, payload.age, payload.gender, payload.interests, payload.photoUrl],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint profile');
      setIsMinting(false);
    }
  };

  // Main mint screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
          💖 BaseMatch
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
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
                <p className="text-gray-700 text-lg">⏳ Syncing wallet with profile...</p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-gray-700 text-lg">Profile minted and synced successfully!</p>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-700 mb-6">Ready to mint your BaseMatch profile NFT?</p>
            <button
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending || isConfirming || isMinting ? 'Processing...' : '✨ Mint Profile NFT'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
