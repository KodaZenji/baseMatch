import { useState } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';

export default function DiscordVerificationButton() {
  const { address } = useAccount();
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDiscordVerify = async () => {
    if (!address) {
      setMessage('Please connect your wallet first');
      setStatus('error');
      return;
    }

    setIsVerifying(true);
    setStatus('idle');

    try {
      const stateResponse = await fetch('/api/discord/generate-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!stateResponse.ok) {
        const data = await stateResponse.json();
        throw new Error(data.error || 'Failed to generate token');
      }

      const { state } = await stateResponse.json();

      const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      const redirectUri = encodeURIComponent(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`
      );
      const scopes = 'identify guilds.join';

      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}`;

      window.location.href = discordAuthUrl;

    } catch (error: any) {
      console.error('Discord verification error:', error);
      setMessage(error.message || 'Verification failed. Please try again.');
      setStatus('error');
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleDiscordVerify}
        disabled={isVerifying || !address}
        className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerifying ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <FaDiscord className="w-5 h-5" />
            <span>Verify with Discord</span>
          </>
        )}
      </button>

      {message && (
        <div className={`flex items-start gap-2 p-4 rounded-lg ${
          status === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {status === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Requirements for "Early OG" Role
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">✓</span>
            <span>BaseMatch profile created</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">✓</span>
            <span>Farcaster account Linked</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
