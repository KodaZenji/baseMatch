// components/ProfileEdit/FarcasterVerificationSection.tsx 
// 1. Dark mode text visibility for helper text
// 2. Auto-refresh after photo choice (no manual refresh needed)

'use client';

import { useState } from 'react';

interface FarcasterVerificationSectionProps {
    hasWallet: boolean;
    farcasterVerified: boolean;
    onVerificationComplete: () => void;
    walletAddress: string;
}

export default function FarcasterVerificationSection({
    hasWallet,
    farcasterVerified,
    onVerificationComplete,
    walletAddress,
}: FarcasterVerificationSectionProps) {
    const [step, setStep] = useState<'initial' | 'input' | 'confirm'>('initial');
    const [fid, setFid] = useState('');
    const [username, setUsername] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
    const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

    if (!hasWallet) return null;

    if (farcasterVerified) {
        return (
            <div className="bg-purple-50 dark:bg-purple-200 border border-purple-200 dark:border-purple-600 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium">Farcaster Verified ✓</span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Your Farcaster badge is active!</p>
            </div>
        );
    }

    const handleVerify = async () => {
        if (!fid || !username) {
            setError('Please enter both FID and username');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            const response = await fetch('/api/verify-farcaster-fid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: walletAddress,
                    fid: fid.trim(),
                    username: username.trim().toLowerCase().replace('@', ''),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed');
                if (data.attemptsLeft !== undefined) {
                    setAttemptsLeft(data.attemptsLeft);
                }
                setIsVerifying(false);
                return;
            }

            if (data.verified) {
                // Show photo confirmation
                setFarcasterProfile(data.profile);
                setStep('confirm');
            }
        } catch (error) {
            setError('Verification failed. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePhotoChoice = async (usePhoto: boolean) => {
        setIsVerifying(true);

        try {
            const response = await fetch('/api/update-farcaster-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: walletAddress,
                    usePhoto,
                    photoUrl: usePhoto ? farcasterProfile.pfp : null,
                }),
            });

            if (response.ok) {
                // FIX: Call verification complete AND refresh the page
                onVerificationComplete();
                
                //  Give a moment for state to update, then refresh
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (error) {
            setError('Failed to update photo');
            setIsVerifying(false);
        }
    };

    if (step === 'confirm' && farcasterProfile) {
        return (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4">
                {/* ✅ FIX: Better dark mode contrast */}
                <h3 className="font-medium text-purple-900 dark:text-purple-300 mb-3">Profile Found! 🎉</h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                        <img 
                            src={farcasterProfile.pfp} 
                            alt="Farcaster"
                            className="w-16 h-16 rounded-full border-2 border-purple-200 dark:border-purple-700"
                        />
                        <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">@{farcasterProfile.username}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{farcasterProfile.displayName}</p>
                        </div>
                    </div>
                    
                    {/* ✅ FIX: Better dark mode text */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        Would you like to update your profile photo from Farcaster?
                    </p>

                    <div className="space-y-2">
                        <button
                            onClick={() => handlePhotoChoice(true)}
                            disabled={isVerifying}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-all"
                        >
                            {isVerifying ? 'Updating...' : 'Yes, use Farcaster photo'}
                        </button>
                        <button
                            onClick={() => handlePhotoChoice(false)}
                            disabled={isVerifying}
                            className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 text-sm font-medium transition-all"
                        >
                            {isVerifying ? 'Updating...' : 'No, keep current photo'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-purple-50 dark:bg-purple-200 border border-purple-200 dark:border-purple-600 rounded-xl p-4">
            <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-3">
             Got a Farcaster account? Verify with FID
            </label>
            
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                Enter your FID and username to verify your Farcaster account
            </p>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg mb-4 text-sm">
                    {error}
                    {attemptsLeft !== null && (
                        <p className="text-xs mt-1">Attempts remaining: {attemptsLeft}/3</p>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Your Farcaster FID
                    </label>
                    <input
                        type="text"
                        value={fid}
                        onChange={(e) => setFid(e.target.value)}
                        placeholder="e.g., 12345"
                        className="w-full px-3 py-2 text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Your Farcaster Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g., username"
                        className="w-full px-3 py-2 text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm"
                    />
                    {/*  FIX: Better dark mode text */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Enter without the @ symbol</p>
                </div>

                <button
                    onClick={handleVerify}
                    disabled={isVerifying || !fid || !username}
                    className="w-full bg-purple-600 dark:bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
                >
                    {isVerifying ? 'Verifying...' : 'Verify Farcaster'}
                </button>
            </div>

            <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
                <a 
                    href="https://warpcast.com/~/settings" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-purple-800 dark:hover:text-purple-300 underline transition-colors"
                >
                    Find your FID in Farcaster settings →
                </a>
            </div>
        </div>
    );
}
