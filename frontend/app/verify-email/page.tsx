'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token || !email) {
            setVerificationStatus('error');
            setMessage('Invalid verification link. Please try again.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch('/api/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token,
                        email,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setVerificationStatus('error');
                    setMessage(data.error || 'Failed to verify email. Please try again.');
                    return;
                }

                // Success
                setVerificationStatus('success');
                setMessage('✅ Email verified successfully!');

                // Check if user is existing or new
                const isExistingUser = data.is_existing_user;

                if (isExistingUser) {
                    // Existing user - redirect to profile edit
                    setMessage('✅ Email verified! Redirecting to your profile...');
                    setTimeout(() => {
                        router.push('/profile/edit');
                    }, 2000);
                } else {
                    // New user - store verification and redirect to complete profile
                    localStorage.setItem('emailVerified', JSON.stringify({
                        email,
                        profile_id: data.profile_id,
                        timestamp: Date.now(),
                    }));

                    setMessage('✅ Email verified! Redirecting to complete your profile...');
                    setTimeout(() => {
                        router.push('/register/email/complete');
                    }, 2000);
                }
            } catch (error) {
                setVerificationStatus('error');
                setMessage('An error occurred during verification. Please try again.');
                console.error('Verification error:', error);
            }
        };

        verifyEmail();
    }, [token, email, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-6">
                    ❤️ BaseMatch
                </h1>

                {verificationStatus === 'loading' && (
                    <>
                        <div className="mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                        <p className="text-gray-700 text-lg">{message}</p>
                    </>
                )}

                {verificationStatus === 'success' && (
                    <>
                        <p className="text-gray-700 text-lg mb-4">{message}</p>
                        <div className="mb-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    </>
                )}

                {verificationStatus === 'error' && (
                    <>
                        <p className="text-red-600 text-lg mb-6">{message}</p>
                        <button
                            onClick={() => router.push('/register/email')}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
