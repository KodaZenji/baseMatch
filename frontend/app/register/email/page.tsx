'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailRegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!email || !email.includes('@')) {
                throw new Error('Please enter a valid email address');
            }

            // Call the register-email API to create token and send verification email
            const response = await fetch('/api/register-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to register email');
            }

            // Store email in localStorage
            localStorage.setItem('emailForRegistration', email);

            // Show success message and wait before redirecting
            setError('');
            // The user will receive email with verification link
            alert(`Verification email sent to ${email}. Please check your inbox!`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2 text-center">
                    ❤️ BaseMatch
                </h1>
                <p className="text-gray-600 text-center mb-8">Email Registration</p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? 'Sending verification email...' : 'Continue with Email'}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                        We'll send a verification link to your email
                    </p>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
