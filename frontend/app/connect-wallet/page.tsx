'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function ConnectWalletPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [email, setEmail] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');

    // Load email from localStorage (from email verification)
    useEffect(() => {
        const emailVerified = localStorage.getItem('emailVerified');
        if (emailVerified) {
            const data = JSON.parse(emailVerified);
            setEmail(data.email);
        }
    }, []);

    // Auto-connect wallet signature when wallet is connected
    useEffect(() => {
        if (isConnected && address && email && !isConnecting) {
            handleConnectWallet();
        }
    }, [isConnected, address, email]);

    const handleConnectWallet = async () => {
        if (!address || !email) {
            setError('Missing email or wallet address');
            return;
        }

        setIsConnecting(true);
        setError('');

        try {
            // Step 1: Sign message to verify wallet ownership
            const message = `Connect wallet ${address} to ${email}\n\nTimestamp: ${Date.now()}`;
            const signature = await signMessageAsync({ message });

            // Step 2: Call connect-wallet API
            const response = await fetch('/api/connect-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    walletAddress: address,
                    signature,
                    message,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect wallet');
            }

            // Step 3: Success! Clear localStorage and redirect to profile/edit
            localStorage.removeItem('emailVerified');
            localStorage.setItem('walletConnected', JSON.stringify({
                address,
                email,
                timestamp: Date.now(),
            }));

            // Redirect to profile completion (where they fill out name, age, etc.)
            router.push('/register/email/complete');
        } catch (err: any) {
            console.error('Error connecting wallet:', err);
            if (err.message.includes('User rejected')) {
                setError('You rejected the signature request. Please try again.');
            } else {
                setError(err.message || 'Failed to connect wallet. Please try again.');
            }
            setIsConnecting(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                        ❤️ BaseMatch
                    </h1>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Step 2: Connect Wallet</h2>
                    <p className="text-gray-700 text-lg mb-6">
                        Your email has been verified! Now connect your wallet to complete your profile.
                    </p>
                    {email && (
                        <div className="bg-green-50 rounded-lg p-3 mb-6">
                            <p className="text-sm text-green-800">
                                ✅ Email verified: <strong>{email}</strong>
                            </p>
                        </div>
                    )}
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                    💖 BaseMatch
                </h1>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {isConnecting ? 'Connecting Wallet...' : 'Wallet Connected!'}
                </h2>
                {error ? (
                    <>
                        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                            {error}
                        </div>
                        <button
                            onClick={handleConnectWallet}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                            Try Again
                        </button>
                    </>
                ) : (
                    <>
                        {isConnecting ? (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                                <p className="text-gray-600">Please sign the message in your wallet...</p>
                            </>
                        ) : (
                            <>
                                <div className="bg-green-50 rounded-lg p-4 mb-4">
                                    <p className="text-green-800 font-medium">✅ Wallet connected successfully!</p>
                                </div>
                                <p className="text-gray-600">Redirecting to profile completion...</p>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
