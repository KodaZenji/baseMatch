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
  const [isSyncing, setIsSyncing] = useState(false);

  // --- LOAD MINT DATA FROM LOCALSTORAGE ---
  useEffect(() => {
    const storedData = localStorage.getItem('emailFirstMint') || localStorage.getItem('walletRegistration');
    if (storedData) {
      try {
        setMintData(JSON.parse(storedData));
      } catch (err) {
        console.error('Failed to parse mint data from localStorage:', err);
        setError('Failed to load minting data');
      }
    }
  }, []);

  // --- HELPER: Sync wallet to Supabase ---
  const syncWalletWithProfile = async (walletAddress: string): Promise<boolean> => {
    setIsSyncing(true);

    try {
      const storedData = localStorage.getItem('emailFirstMint') || localStorage.getItem('walletRegistration');
      if (!storedData) {
        console.log('ℹ️ No registration data found, skipping sync.');
        setIsSyncing(false);
        return true;
      }

      const parsed = JSON.parse(storedData);
      const id = parsed.id; // <-- Use Supabase primary key 'id'
      if (!id) throw new Error('Supabase profile ID missing in localStorage.');

      const response = await fetch('/api/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, wallet_address: walletAddress }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to sync wallet');

      console.log('✅ Wallet synced successfully', result.profile);

      // Clean up localStorage after successful sync
      localStorage.removeItem('emailFirstMint');
      localStorage.removeItem('walletRegistration');

      setIsSyncing(false);
      return true;
    } catch (err: any) {
      console.error('❌ Wallet sync failed:', err);
      setError(err.message || 'Internal sync error');
      setIsSyncing(false);
      return false;
    }
  };

  // --- POST-MINT EFFECT ---
  useEffect(() => {
    const handlePostMint = async () => {
      if (isSuccess && mintData && address && !isSyncing) {
        console.log('🎉 Mint confirmed, syncing wallet...');
        const success = await syncWalletWithProfile(address);
        if (success) {
          console.log('🔄 Redirecting to dashboard...');
          setTimeout(() => router.push('/'), 2000);
        }
      }
    };
    handlePostMint();
  }, [isSuccess, address, mintData, isSyncing, router]);

  // --- MINT HANDLER ---
  const handleMint = async () => {
    if (!mintData?.createProfilePayload && !mintData?.mintingPayload && !mintData?.registerWithEmailPayload) {
      setError('No minting payload available.');
      return;
    }

    setError('');
    setIsMinting(true);

    try {
      if (mintData.useRegisterWithEmail) {
        const payload = mintData.registerWithEmailPayload;
        writeContract({
          address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
          abi: PROFILE_NFT_ABI,
          functionName: 'registerWithEmail',
          args: [payload.name, payload.age, payload.gender, payload.interests, payload.email],
        });
      } else {
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

  // --- RENDER ---
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md text-center">
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {isSuccess || isSyncing ? (
          <p>{isSyncing ? '⏳ Syncing wallet...' : '🎉 Profile minted and synced!'}</p>
        ) : (
          <>
            <button
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinting}
              className="bg-blue-600 text-white py-3 px-6 rounded-xl"
            >
              {isPending || isConfirming || isMinting ? 'Processing...' : '✨ Mint Profile NFT'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
