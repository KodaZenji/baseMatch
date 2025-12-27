'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart } from 'lucide-react';

export default function WalletMintPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [mintData, setMintData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

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
          payload.age,
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

  // --- RENDER LOGIC ---

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
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
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>

          <div className="flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700 text-lg">Checking profile status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
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
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
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

  if (!mintData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
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
          </div>

          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            BaseMatch
          </h1>

          <p className="text-gray-700 mb-6">{error || 'No registration data found'}</p>
          <button
            onClick={() => router.push('/register/wallet/complete')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
          >
            Back to Registration
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
          <div className="relative">
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
        </div>

        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          BaseMatch
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">🎉</p>
            <p className="text-gray-700 text-lg font-semibold mb-2">Profile minted successfully!</p>
            <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-700 mb-2">Ready to mint your BaseMatch profile NFT?</p>
            <p className="text-gray-500 text-sm mb-6">This will create your on-chain profile.</p>
            
            {/* Show preview of data being minted */}
            {mintData?.registerWithWalletPayload && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-gray-500 mb-2">Profile Preview:</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Name:</span> {mintData.registerWithWalletPayload.name}</p>
                  <p><span className="font-medium">Age:</span> {mintData.registerWithWalletPayload.age}</p>
                  <p><span className="font-medium">Gender:</span> {mintData.registerWithWalletPayload.gender}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending || isConfirming || isMinting ? 'Minting...' : '✨ Mint Profile NFT'}
            </button>
            
            <button
              onClick={() => router.push('/register/wallet/complete')}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-400"
            >
              ← Back to Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
