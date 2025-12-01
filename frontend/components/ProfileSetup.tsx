'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfileSetup({ onProfileCreated }: { onProfileCreated?: () => void }) {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [avatarUrl, setAvatarUrl] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        interests: '',
    });
    const [isEmailUser, setIsEmailUser] = useState(false);
    const [formError, setFormError] = useState('');
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    // State for email data
    const [emailData, setEmailData] = useState<{ email?: string }>({});

    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

    // Add debug logging helper
    const addDebug = (message: string) => {
        console.log(message);
        setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    };

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.PROFILE_NFT &&
        CONTRACTS.PROFILE_NFT.startsWith('0x') &&
        CONTRACTS.PROFILE_NFT.length === 42;

    useEffect(() => {
        addDebug(`Contract deployed: ${isContractDeployed}, Address: ${CONTRACTS.PROFILE_NFT}`);
        addDebug(`Wallet connected: ${isConnected}, Address: ${address}`);
    }, [isContractDeployed, isConnected, address]);

    // Check if user registered with email
    const { data: profileData, error: readError } = useReadContract({
        address: isContractDeployed ? (CONTRACTS.PROFILE_NFT as `0x${string}`) : undefined,
        abi: PROFILE_NFT_ABI,
        functionName: 'getProfile',
        args: address && isContractDeployed ? [address as `0x${string}`] : undefined,
    });

    useEffect(() => {
        if (readError) {
            addDebug(`Profile read error: ${readError.message}`);
            // Handle the specific error case where the contract ABI doesn't match
            if (readError.message.includes('InvalidBytesBooleanError') || readError.message.includes('Bytes value')) {
                setFormError('There was an issue loading your profile. The contract may need to be updated. Please try refreshing the page or contact support.');
            }
        }
        if (profileData) {
            // Use a custom replacer to handle BigInt values
            const profileString = JSON.stringify(profileData, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            );
            addDebug(`Profile data received: ${profileString}`);
        }
    }, [profileData, readError]);

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            try {
                const avatarUrl = generateAvatar(address);
                setAvatarUrl(avatarUrl);
                addDebug('Avatar generated successfully');
            } catch (err) {
                console.error('Error generating avatar:', err);
                addDebug(`Avatar generation error: ${err}`);
                setAvatarUrl('');
            }

            // Check if this is an email user
            if (profileData && isContractDeployed) {
                try {
                    // profileData is a struct/tuple object
                    const profile = profileData as any;

                    console.log('Profile data in setup:', profile);

                    if (profile && profile.exists) {
                        if (profile.email && typeof profile.email === 'string' && profile.email.length > 0) {
                            setIsEmailUser(true);
                            setEmailData({ email: profile.email });
                            setFormData({
                                name: profile.name || '',
                                age: profile.age ? profile.age.toString() : '',
                                gender: profile.gender || '',
                                interests: profile.interests || '',
                            });
                            addDebug('Email user detected from profile');
                        }
                    } else {
                        const pendingEmail = localStorage.getItem('pendingEmailRegistration');
                        if (pendingEmail) {
                            try {
                                const emailData = JSON.parse(pendingEmail);
                                if (emailData.address === address) {
                                    setIsEmailUser(true);
                                    setEmailData({ email: emailData.email });
                                    setFormData({
                                        name: emailData.name || '',
                                        age: emailData.age ? emailData.age.toString() : '',
                                        gender: profile.gender || '',
                                        interests: emailData.interests || '',
                                    });
                                    addDebug('Email user detected from localStorage');
                                }
                            } catch (err) {
                                addDebug(`Error parsing pending email: ${err}`);
                            }
                        }
                    }
                } catch (err) {
                    addDebug(`Error processing profile data: ${err}`);
                }
            }
        }
    }, [address, profileData, isContractDeployed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        try {
            // Validate form data
            if (!formData.name || !formData.age || !formData.gender || !formData.interests) {
                const errorMsg = 'Please fill in all required fields';
                setFormError(errorMsg);
                addDebug(errorMsg);
                return;
            }

            const age = parseInt(formData.age);
            addDebug(`Validating age: ${age} (type: ${typeof age})`);

            if (isNaN(age)) {
                const errorMsg = 'Please enter a valid age';
                setFormError(errorMsg);
                addDebug(errorMsg);
                return;
            }

            if (age < 18) {
                const errorMsg = 'You must be at least 18 years old';
                setFormError(errorMsg);
                addDebug(errorMsg);
                return;
            }

            if (age > 100) {
                const errorMsg = 'Please enter a valid age between 18 and 100';
                setFormError(errorMsg);
                addDebug(errorMsg);
                return;
            }

            addDebug(`Contract address: ${CONTRACTS.PROFILE_NFT}`);
            addDebug(`User address: ${address}`);
            addDebug(`Form data: name=${formData.name}, age=${age}, gender=${formData.gender}`);

            if (isEmailUser) {
                addDebug('Updating profile for email user...');
                writeContract({
                    address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                    abi: PROFILE_NFT_ABI,
                    functionName: 'updateProfile',
                    args: [formData.name, age, formData.gender, formData.interests, avatarUrl, emailData.email || ''],
                });
            } else {
                addDebug('Creating new profile for wallet user...');
                writeContract({
                    address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                    abi: PROFILE_NFT_ABI,
                    functionName: 'createProfile',
                    args: [formData.name, age, formData.gender, formData.interests, avatarUrl],
                });
            }
        } catch (error: any) {
            const errorMsg = 'Failed to create profile: ' + (error.message || error);
            setFormError(errorMsg);
            addDebug(errorMsg);
            console.error('Full error:', error);
        }
    };

    useEffect(() => {
        if (writeError) {
            const errorMsg = 'Contract write error: ' + writeError.message;
            setFormError(errorMsg);
            addDebug(errorMsg);
        }

        if (receiptError) {
            const errorMsg = 'Transaction receipt error: ' + receiptError.message;
            setFormError(errorMsg);
            addDebug(errorMsg);
        }
    }, [writeError, receiptError]);

    useEffect(() => {
        addDebug(`Transaction status - isPending: ${isPending}, isConfirming: ${isConfirming}, isSuccess: ${isSuccess}`);
        if (hash) {
            addDebug(`Transaction hash: ${hash}`);
        }

        if (isSuccess) {
            localStorage.removeItem('pendingEmailRegistration');
            addDebug('Transaction successful! Registering profile in database...');

            // Register profile in Supabase for discovery
            const registerProfile = async () => {
                try {
                    const response = await fetch('/api/profile/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            address: address,
                            name: formData.name,
                            age: parseInt(formData.age),
                            gender: formData.gender,
                            interests: formData.interests,
                            email: emailData.email || '',
                            photoUrl: avatarUrl,
                        }),
                    });

                    if (response.ok) {
                        addDebug('Profile registered in database');
                    } else {
                        console.warn('Failed to register profile in database');
                    }
                } catch (err) {
                    console.warn('Error registering profile:', err);
                }

                // Get query client and invalidate all queries to force refetch
                const client = useQueryClient();
                client.invalidateQueries();

                // Add a delay to ensure the transaction is fully processed on-chain
                setTimeout(() => {
                    addDebug('Redirecting to home page...');

                    // Notify parent component that profile was created
                    if (onProfileCreated) {
                        onProfileCreated();
                    } else {
                        router.push('/');
                    }

                    // Fallback redirect
                    setTimeout(() => {
                        if (typeof window !== 'undefined') {
                            window.location.href = '/';
                        }
                    }, 2000);
                }, 1500);
            };

            registerProfile();
        }
    }, [isPending, isConfirming, isSuccess, hash, onProfileCreated]);

    // Wallet not connected
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                            💖 BaseMatch
                        </h1>
                        <p className="text-gray-600 text-lg">Wallet Not Connected</p>
                    </div>
                    <p className="text-gray-700 mb-6">
                        Please connect your wallet to continue with profile setup.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    // Contract not deployed
    if (!isContractDeployed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                            💖 BaseMatch
                        </h1>
                        <p className="text-gray-600 text-lg">Contract Error</p>
                    </div>
                    <p className="text-gray-700 mb-4">
                        The profile contract is not deployed or has an invalid address.
                    </p>
                    <p className="text-sm text-gray-500 mb-6 font-mono break-all">
                        {CONTRACTS.PROFILE_NFT || 'No address configured'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    // Success state with delay
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white text-2xl mb-4">Successfull!</div>
                    <div className="text-white text-lg">Redirecting to app...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
                <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {isEmailUser ? 'Complete Your Profile' : 'Create Your Profile'}
                </h2>
                <p className="text-gray-600 text-center mb-8">
                    {isEmailUser
                        ? 'You registered with email. Connect your wallet to complete your profile.'
                        : 'Your profile is a unique NFT ID that can\'t be transferred'}
                </p>

                {formError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center">
                        {avatarUrl ? (
                            <div className="relative">
                                <img
                                    src={avatarUrl}
                                    alt="Auto-generated avatar"
                                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                                />
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    Auto-generated
                                </div>
                            </div>
                        ) : (
                            <div className="w-32 h-32 rounded-full border-4 border-gray-300 flex items-center justify-center">
                                <span className="text-gray-400">Loading...</span>
                            </div>
                        )}
                    </div>

                    {/* Email Display for Email Users */}
                    {isEmailUser && emailData.email && (
                        <div className="bg-blue-50 rounded-xl p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Registered Email
                            </label>
                            <div className="flex items-center">
                                <input
                                    type="email"
                                    value={emailData.email}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300"
                                />

                            </div>

                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age
                        </label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18"
                            min="18"
                            max="100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender
                        </label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select Gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interests (comma separated)
                        </label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hiking, Photography, Crypto, Art"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                        <p>Your avatar is automatically generated from your wallet address and will be unique to you.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || isConfirming || !avatarUrl}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPending ? 'Submitting...' : isConfirming ? 'Confirming Transaction...' : isEmailUser ? 'Complete Profile' : 'Create Profile NFT'}
                    </button>
                </form>
            </div>
        </div>
    );
}
