interface FarcasterVerificationSectionProps {
    hasWallet: boolean;
    farcasterVerified: boolean;
    isCheckingFarcaster: boolean;
    farcasterProfile: any;
    showFarcasterOptions: boolean;
    onCheckFarcaster: () => void;
    onVerifyFarcaster: (usePhoto: boolean) => void;
    onCancel: () => void;
}

export default function FarcasterVerificationSection({
    hasWallet,
    farcasterVerified,
    isCheckingFarcaster,
    farcasterProfile,
    showFarcasterOptions,
    onCheckFarcaster,
    onVerifyFarcaster,
    onCancel,
}: FarcasterVerificationSectionProps) {
    if (!hasWallet) return null;

    if (farcasterVerified) {
        return (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-900">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium">Farcaster Verified ✓</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">Your Farcaster badge is active on your profile!</p>
            </div>
        );
    }

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-purple-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Get Farcaster Verified Badge
            </label>
            
            <p className="text-sm text-purple-700 mb-3">
                Have a Farcaster account? Link this wallet to get the verified badge!
            </p>

            {!showFarcasterOptions ? (
                <button
                    type="button"
                    onClick={onCheckFarcaster}
                    disabled={isCheckingFarcaster}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                    {isCheckingFarcaster ? 'Checking...' : 'Check if I linked Farcaster'}
                </button>
            ) : (
                <div className="space-y-3">
                    {farcasterProfile && (
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex items-center gap-3 mb-3">
                                {farcasterProfile.pfp && (
                                    <img 
                                        src={farcasterProfile.pfp} 
                                        alt="Farcaster profile" 
                                        className="w-12 h-12 rounded-full"
                                    />
                                )}
                                <div>
                                    <p className="font-semibold text-purple-900">@{farcasterProfile.username}</p>
                                    <p className="text-xs text-purple-600">{farcasterProfile.displayName}</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">Choose how you want to verify:</p>
                            
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => onVerifyFarcaster(false)}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    Verify with my current photo
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => onVerifyFarcaster(true)}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                                >
                                    Verify & use Farcaster photo
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm text-purple-600 hover:text-purple-800"
                    >
                        ← Cancel
                    </button>
                </div>
            )}

            {!showFarcasterOptions && (
                <div className="mt-3 text-xs text-purple-600">
                    <a 
                        href="https://warpcast.com/~/settings/verified-addresses" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-purple-800 underline"
                    >
                        Learn how to link your wallet on Farcaster →
                    </a>
                </div>
            )}
        </div>
    );
}
