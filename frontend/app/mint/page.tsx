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
    
    // State for checking profile status before minting
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [statusError, setStatusError] = useState('');

    useEffect(() => {
        // Only run if wallet is connected and we have an address
        if (!address) {
            setIsCheckingStatus(false);
            // If disconnected, clear any pending data just in case
            setMintData(null);
            return;
        }

        const checkProfileStatus = async () => {
            setIsCheckingStatus(true);
            setStatusError('');

            try {
                // 🛑 Step 1: Check if the user is already registered/minted
                const response = await fetch('/api/profile/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address }),
                });

                const statusData = await response.json();

                if (response.ok && statusData.profileExists) {
                    // 🛑 CRITICAL FIX: User found! Redirect to the main app dashboard
                    console.log('User profile found. Redirecting to dashboard.');
                    router.push('/browse'); // Change to your main app route
                    return;
                }

                // Step 2: If not existing, proceed to safely load minting payload
                const walletReg = localStorage.getItem('walletRegistration');
                const emailFirstReg = localStorage.getItem('emailFirstMint');
                const regString = walletReg || emailFirstReg; // Will be string or null

                // ✅ FIX 3: Safely parse localStorage item
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
    }, [address, router]); // Re-run if address changes

    // Handle successful mint (No change needed)
    useEffect(() => {
        if (isSuccess && mintData) {
            // Clear registration data
            localStorage.removeItem('walletRegistration');
            localStorage.removeItem('emailFirstMint');

            // Redirect to dashboard
            setTimeout(() => {
                router.push('/browse'); // Change to your main app route
            }, 2000);
        }
    }, [isSuccess, mintData, router]);

    // 🛑 NEW RENDER BLOCK: Status Check Loading
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
    
    // Original wallet connection check
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

    // Original mintData check
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

    // Original handleMint function (No changes needed, relies on fixed API payload)
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
                // Email-first flow: use registerWithEmail (no photo)
                const payload = mintData.registerWithEmailPayload;
                writeContract({
                    address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
                    abi: PROFILE_NFT_ABI,
                    functionName: 'registerWithEmail',
                    args: [
                        payload.name,
                        payload.age,
                        payload.gender,
                        payload.interests,
                        payload.email,
                    ],
                });
            } else {
                // Wallet-first flow: use createProfile (with photo)
                const payload = mintData.createProfilePayload || mintData.mintingPayload;
                // CRITICAL: payload.photoUrl now contains the SHORT HASH from the API
                writeContract({
                    address: (mintData.contractAddress || CONTRACTS.PROFILE_NFT) as `0x${string}`,
                    abi: PROFILE_NFT_ABI,
                    functionName: 'createProfile',
                    args: [
                        payload.name,
                        payload.age,
                        payload.gender,
                        payload.interests,
                        payload.photoUrl, // This is the short hash
                    ],
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mint profile');
            setIsMinting(false);
        }
    };

    // Original render block (No change needed)
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                    💖 BaseMatch
                </h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {isSuccess ? (
                    <>
                        <div className="mb-6">
                            <div className="text-6xl mb-4">🎉</div>
                            <p className="text-gray-700 text-lg font-semibold">Profile Minted Successfully!</p>
                        </div>
                        <p className="text-gray-600 mb-6">Your NFT profile has been created on Base Sepolia.</p>
                        {mintData?.needsEmailVerification && (
                            <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-6">
                                <p className="text-sm text-yellow-800">
                                    📧 Please verify your email to unlock the full verified badge.
                                </p>
                            </div>
                        )}
                        <p className="text-gray-600 text-sm">Redirecting to dashboard...</p>
                    </>
                ) : (
                    <>
                        <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
                            <h3 className="font-semibold text-gray-800 mb-3">Profile Summary</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p><strong>Name:</strong> {mintData?.createProfilePayload?.name || mintData?.mintingPayload?.name || mintData?.registerWithEmailPayload?.name}</p>
                                <p><strong>Age:</strong> {mintData?.createProfilePayload?.age || mintData?.mintingPayload?.age || mintData?.registerWithEmailPayload?.age}</p>
                                <p><strong>Gender:</strong> {mintData?.createProfilePayload?.gender || mintData?.mintingPayload?.gender || mintData?.registerWithEmailPayload?.gender}</p>
                                <p><strong>Email:</strong> {mintData?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleMint}
                            disabled={isPending || isConfirming || isMinting}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
                        >
                            {isPending || isConfirming || isMinting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isPending ? 'Waiting for signature...' : 'Confirming transaction...'}
                                </span>
                            ) : (
                                '✨ Mint My Profile NFT'
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                            Back to home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
