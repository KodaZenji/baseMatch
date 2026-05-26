'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Trophy,
  Zap,
  Clock3,
  XCircle
} from 'lucide-react';

export default function CheckWhitelistPage() {
  const router = useRouter();

  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const checkEligibility = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        '/api/check-whitelist-eligibility',
        {
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            wallet
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Check failed');
        setLoading(false);
        return;
      }

      setResult(data);

    } catch {
      setError('Network error');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-lg mx-auto px-5 py-10">

        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-[#8E8E93] hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4"/>
          Back
        </button>

        <div className="mb-8">

          <h1 className="text-[32px] font-semibold mb-3">
            Check Eligibility
          </h1>

          <p className="text-[#8E8E93] text-[15px]">
            Enter your wallet address to see your whitelist status.
          </p>

        </div>

        <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-5 mb-6">

          <input
            type="text"
            placeholder="0x..."
            value={wallet}
            onChange={(e)=>setWallet(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white placeholder-[#8E8E93] mb-4"
          />

          <button
            onClick={checkEligibility}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#A855F7] font-semibold hover:bg-[#9333EA]"
          >
            {loading ? (
              'Checking...'
            ) : (
              <span className="flex items-center justify-center gap-2">
                Check Status
                <Search className="w-4 h-4"/>
              </span>
            )}
          </button>

        </div>

        {error && (

          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
            {error}
          </div>

        )}

        {result?.verification_status === 'approved' &&
        result?.whitelist_type === 'og' && (

          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">

            <div className="flex items-center gap-3 mb-4">

              <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 flex items-center justify-center">

                <Trophy className="w-5 h-5 text-[#C084FC]"/>

              </div>

              <div>

                <h2 className="font-semibold text-lg">
                  Whitelist Secured
                </h2>

                <p className="text-[#C084FC]">
                  You are OG 🏆
                </p>

              </div>

            </div>

          </div>

        )}

        {result?.verification_status === 'approved' &&
        result?.whitelist_type === 'fcfs' && (

          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 flex items-center justify-center">

                <Zap className="w-5 h-5 text-[#C084FC]"/>

              </div>

              <div>

                <h2 className="font-semibold text-lg">
                  Whitelist Secured
                </h2>

                <p className="text-[#C084FC]">
                  You are FCFS ⚡
                </p>

              </div>

            </div>

          </div>

        )}

        {result?.verification_status === 'pending' && (

          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">

                <Clock3 className="w-5 h-5 text-yellow-400"/>

              </div>

              <div>

                <h2 className="font-semibold">
                  Under Review
                </h2>

                <p className="text-[#8E8E93]">
                  Your application is still pending.
                </p>

              </div>

            </div>

          </div>

        )}

        {result?.found === false && (

          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">

                <XCircle className="w-5 h-5 text-red-400"/>

              </div>

              <div>

                <h2 className="font-semibold">
                  Wallet Not Found
                </h2>

                <p className="text-[#8E8E93]">
                  No application exists for this wallet.
                </p>

              </div>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}
