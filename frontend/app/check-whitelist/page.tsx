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

const BLUE = '#0052FF';
const BLUE_LIGHT = '#4d8aff';

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
      const res = await fetch('/api/check-whitelist-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });

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
          className="flex items-center gap-1.5 text-[#8E8E93] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
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
            onChange={(e) => setWallet(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white placeholder-[#8E8E93] mb-4 focus:outline-none transition-all"
            onFocus={e => e.target.style.borderColor = `${BLUE}80`}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
          />

          <button
            onClick={checkEligibility}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
          >
            {loading ? (
              'Checking...'
            ) : (
              <span className="flex items-center justify-center gap-2">
                Check Status
                <Search className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* OG approved */}
        {result?.verification_status === 'approved' && result?.whitelist_type === 'og' && (
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BLUE}25` }}>
                <Trophy className="w-6 h-6" style={{ color: BLUE_LIGHT }} />
              </div>
              <h2 className="font-bold text-xl text-white">Whitelist Secured</h2>
              <p className="font-bold text-lg" style={{ color: BLUE_LIGHT }}>You are OG 🏆</p>
              <p className="text-[#8E8E93] text-sm">Your spot is locked in. Stay tuned for mint details.</p>
            </div>
          </div>
        )}

        {/* FCFS approved */}
        {result?.verification_status === 'approved' && result?.whitelist_type === 'fcfs' && (
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BLUE}25` }}>
                <Zap className="w-6 h-6" style={{ color: BLUE_LIGHT }} />
              </div>
              <h2 className="font-bold text-xl text-white">Whitelist Secured</h2>
              <p className="font-bold text-lg" style={{ color: BLUE_LIGHT }}>You are FCFS ⚡</p>
              <p className="text-[#8E8E93] text-sm">First come, first served — be ready on mint day.</p>
            </div>
          </div>
        )}

        {/* Pending */}
        {result?.verification_status === 'pending' && (
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock3 className="w-6 h-6 text-yellow-400" />
              </div>
              <h2 className="font-bold text-xl text-white">Under Review</h2>
              <p className="font-bold text-base text-yellow-400">Application Pending</p>
              <p className="text-[#8E8E93] text-sm">Your application is still being reviewed. Check back soon.</p>
            </div>
          </div>
        )}

        {/* Not found */}
        {result?.found === false && (
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="font-bold text-xl text-white">Wallet Not Found</h2>
              <p className="font-bold text-base text-red-400">No Entry Found</p>
              <p className="text-[#8E8E93] text-sm">No application exists for this wallet address.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
