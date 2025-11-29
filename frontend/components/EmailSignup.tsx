'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { useRouter } from 'next/navigation';

export default function EmailSignup() {
    const router = useRouter();
    const { address, isConnected, connector } = useAccount();
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        interests: '',
        email: '',
    });
    const [formError, setFormError] = useState('');

    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if contract is deployed
    const isContractDeployed = CONTRACTS.PROFILE_NFT && 
                               CONTRACTS.PROFILE_NFT.startsWith('0x') && 
                               CONTRACTS.PROFILE_NFT.length === 42;

    useEffect(() => {
        console.log('Contract deployed check:', isContractDeployed, CONTRACTS.PROFILE_NFT);
        console.log('Wallet connection status:', { isConnected, address, connector: connector?.name });
    }, [isContractDeployed, isConnected, address, connector]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        console.log('Form submitted with data:', formData);

        // Validation
        if (!isConnected) {
            const errorMsg = 'Please connect your wallet first';
            setFormError(errorMsg);
            console.error(errorMsg);
            return;
        }

        if (!address) {
            const errorMsg = 'Wallet address not found';
            setFormError(errorMsg);
            console.error(errorMsg);
            return;
        }

        if (!isContractDeployed) {
            const errorMsg = 'Contract not deployed';
            setFormError(errorMsg);
            console.error(errorMsg);
            return;
        }

        if (!formData.name || !formData.age || !formData.interests || !formData.email) {
            const errorMsg = 'Please fill in all fields';
            setFormError(errorMsg);
            console.error(errorMsg);
            return;
        }

        const age = parseInt(formData.age);
        if (isNaN(age) || age < 18 || age > 100) {
            const errorMsg = 'Please enter a valid age between 18 and 100';
            setFormError(errorMsg);
            console.error(errorMsg);
            return;
        }

        try {
            console.log('Attempting to register with email...');
            console.log('Calling writeContract with params:', {
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'registerWithEmail',
                args: [formData.name, age, formData.interests, formData.email],
            });

            // Wait for connector to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'registerWithEmail',
                args: [formData.name, age, formData.interests, formData.email],
            });

            console.log('Contract write initiated');

            // Store data in localStorage for later completion
            localStorage.setItem('pendingEmailRegistration', JSON.stringify({
                ...formData,
                age,
                address,
                timestamp: Date.now(),
            }));
        } catch (error: any) {
            const errorMsg = 'Failed to register: ' + (error.message || error);
            console.error(errorMsg, error);
            setFormError(errorMsg);
        }
    };

    useEffect(() => {
        if (error) {
            console.error('Contract write error:', error);
            setFormError('Contract write error: ' + error.message);
        }
    }, [error]);

    useEffect(() => {
        console.log('Transaction status - isPending:', isPending, 'isConfirming:', isConfirming, 'isSuccess:', isSuccess, 'hash:', hash);
    }, [isPending, isConfirming, isSuccess, hash]);

    // Redirect on success
    useEffect(() => {
        if (isSuccess && address) {
            console.log('Registration successful! Redirecting to profile setup...');
            setTimeout(() => {
                router.push('/profile/setup');
            }, 2000);
        }
    }, [isSuccess, address, router]);

    // Show wallet connection required
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                            💖 BaseMatch
                        </h1>
                        <p className="text-gray-600 text-lg">Connect Wallet Required</p>
                    </div>
                    <p className="text-gray-700 mb-6">
                        Please connect your wallet using the button at the top of the page to continue with email registration.
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

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white text-2xl mb-4">✅ Email Registered Successfully!</div>
                    <div className="text-white text-lg">Redirecting to complete your profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                        💖 BaseMatch
                    </h1>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign Up with Email</h2>
                    <p className="text-gray-600">Create your profile to get started</p>
                </div>

                {formError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18"
                            min="18"
                            max="100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interests (comma separated)
                        </label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hiking, Photography, Crypto"
                            rows={3}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
                        <p className="font-semibold mb-1">Connected Wallet:</p>
                        <p className="font-mono text-xs break-all">{address}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || isConfirming || !isConnected}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Register with Email'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                        onClick={() => router.push('/login')}
                        className="text-blue-600 hover:underline font-semibold"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}