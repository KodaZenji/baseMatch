'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  // ✅ NEW: countdown timer (10 minutes)
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const storedEmail = localStorage.getItem('emailForRegistration');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      setStatus('error');
      setMessage('No email found. Please start registration again.');
    }
  }, []);

  // ✅ NEW: countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // ✅ NEW: time formatter
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6 || timeLeft <= 0) return;

    setIsVerifying(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Invalid code. Please try again.');
        setIsVerifying(false);
        return;
      }

      setStatus('success');
      setMessage('✅ Email verified successfully!');

      const isExistingUser = data.is_existing_user;

      if (isExistingUser) {
        setTimeout(() => {
          router.push('/profile/edit');
        }, 2000);
      } else {
        localStorage.setItem(
          'emailVerified',
          JSON.stringify({
            email,
            profile_id: data.profile_id,
            timestamp: Date.now(),
          })
        );

        setTimeout(() => {
          router.push('/register/email/complete');
        }, 2000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setStatus('idle');
    setCode(['', '', '', '', '', '']);
    setMessage('');

    // ✅ reset timer on resend
    setTimeLeft(600);

    try {
      const response = await fetch('/api/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('New code sent to ' + email);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="bg-white rounded-full p-3 shadow-lg">
              <Heart
                className="w-12 h-12"
                fill="url(#brandGradient)"
                stroke="none"
              />
              {/* ✅ UPDATED: brand gradient */}
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: BaseMatch text gradient */}
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          BaseMatch
        </h1>

        <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
          Email Verification
        </h2>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{message}</p>
          </div>
        )}

        {/* Email Display */}
        {email && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 justify-center text-gray-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">{email}</span>
            </div>
          </div>
        )}

        <p className="text-center text-gray-600 mb-6 text-sm">
          Enter the 6-digit code we sent to your email
        </p>

        {/* Code Input */}
        <div className="flex gap-2 justify-center mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={code.join('').length !== 6 || isVerifying || timeLeft <= 0}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </span>
          ) : (
            'Verify Email'
          )}
        </button>

        {/* Resend Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            className="text-blue-600 font-semibold hover:text-blue-700 transition-colors text-sm"
          >
            Resend Code
          </button>
        </div>

        {/* UPDATED: live expiry timer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Code expires in{' '}
          <span className="font-semibold text-gray-700">
            {formatTime(timeLeft)}
          </span>
        </p>
      </div>
    </div>
  );
}
