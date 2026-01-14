import { Mail, Lock } from 'lucide-react';

interface EmailVerificationSectionProps {
    email: string;
    isVerified: boolean;
    isSending: boolean;
    onEmailChange: (email: string) => void;
    onSendVerification: () => void;
}

export default function EmailVerificationSection({
    email,
    isVerified,
    isSending,
    onEmailChange,
    onSendVerification,
}: EmailVerificationSectionProps) {
    return (
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} /> Email Address
                {isVerified && (
                    <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        ✓ Blockchain Verified
                    </span>
                )}
            </label>
            <div className="space-y-2">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                />
                <button
                    type="button"
                    onClick={onSendVerification}
                    disabled={isSending || !email || !email.includes('@')}
                    className="w-full px-3 py-2 bg-green-400 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSending ? 'Sending...' : 'Send Verification Code'}
                </button>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Lock size={12} /> A 6-digit code will be sent to verify your email
                </p>
            </div>
        </div>
    );
}
