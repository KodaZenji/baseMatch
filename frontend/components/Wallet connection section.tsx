'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface WalletConnectionSectionProps {
    userEmail: string;
    onWalletLinked: () => void;
}

export default function WalletConnectionSection({ userEmail, onWalletLinked }: WalletConnectionSectionProps) {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLinkWallet = async () => {
        if (!address || !isConnected) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLinking(true);
        setError('');
        setSuccess('');

        try {
            // Sign message to verify wallet ownership
            const message = `Link wallet ${address} to ${userEmail}\n\nTimestamp: ${Date.now()}`;
            const signature = await signMessageAsync({ message });

            // Call API to link wallet to email account
            const response = await fetch('/api/profile/link-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    address,
                    signature,
                    message,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to link wallet');
            }

            setSuccess('Wallet linked successfully! You can now mint your profile NFT.');
            onWalletLinked();
        } catch (err) {
            console.error('Error linking wallet:', err);
            setError(err instanceof Error ? err.message : 'Failed to link wallet');
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                🔗 Connect Wallet
            </label>

            {!isConnected ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                        Connect your wallet to mint your profile NFT and unlock all features.
                    </p>
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="text-xs text-gray-500 mb-1">Connected Wallet:</p>
                        <p className="font-mono text-sm text-gray-800 break-all">{address}</p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleLinkWallet}
                        disabled={isLinking}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {isLinking ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Linking Wallet...
                            </span>
                        ) : (
                            '🔗 Link Wallet to Profile'
                        )}
                    </button>

                    <p className="text-xs text-gray-500">
                        Linking your wallet will allow you to mint your profile as an NFT and access matching features.
                    </p>
                </div>
            )}
        </div>
    );
                          }
