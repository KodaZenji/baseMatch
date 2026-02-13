'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckInButton } from './CheckInButton';
import { InviteLink } from './InviteLink';
import { RankingsTable } from './RankingsTable';
import { AutoCheckPurchase } from './AutoCheckPurchase';
import { Trophy, Zap, Users, TrendingUp } from 'lucide-react';

interface SuccessModalProps {
  referralCode?: string | null;
  onClose: () => void;
}

function SuccessModal({ referralCode, onClose }: SuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md text-center shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
          🎉 Welcome to the Race!
        </h2>
        {referralCode ? (
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            You joined with code <span className="font-mono font-bold text-[#0052FF]">{referralCode}</span>
            <br/><br/>
            👉 Next step: Invite 1 friend to unlock check-ins!
          </p>
        ) : (
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            👉 Next step: Invite 1 friend to unlock check-ins!
          </p>
        )}
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gradient-to-r from-[#0052FF] to-[#5B8DEE] hover:from-[#0041CC] hover:to-[#4A7BD9] text-white font-bold rounded-xl shadow-lg transition-all"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

export default function Race() {
  const { address } = useAccount();

  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [joiningWithCode, setJoiningWithCode] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successReferralCode, setSuccessReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (address) checkStatus();
  }, [address]);

  useEffect(() => {
    // Pre-fill referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get('ref');
    if (urlCode) {
      setReferralCodeInput(urlCode.toUpperCase());
      setJoiningWithCode(true);
    }
  }, []);

  async function checkStatus() {
  setLoading(true);
  setError(null);

  try {
    // 1. Check if profile exists
    const profileRes = await fetch('/api/profile/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    const profileStatus = await profileRes.json();

    if (!profileStatus.profileExists) {
      setHasProfile(false);
      setError('Please create a profile first before joining the race.');
      setLoading(false);
      return;
    }

    setHasProfile(true);

    // 2.  Check if already joined using READ-ONLY status endpoint
    const statusRes = await fetch(`/api/leaderboard/status?wallet=${address}`);
    const statusData = await statusRes.json();

    console.log('📊 Status check result:', statusData);

    if (statusData.joined) {
      // Already joined - show main interface
      console.log('✅ User already joined');
      setParticipant(statusData.participant);
      setShowJoinForm(false);
    } else {
        setShowJoinForm(true);
    }

  } catch (err: any) {
    console.error('Status check error:', err);
    setError(err.message || 'Network error');
  } finally {
    setLoading(false);
  }
}

  async function handleJoin() {
    setLoading(true);
    const code = joiningWithCode ? referralCodeInput.trim().toUpperCase() : null;

    console.log('🚀 Attempting to join with code:', code);

    try {
      const res = await fetch('/api/leaderboard/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address, 
          referralCode: code 
        })
      });

      const data = await res.json();
      console.log('📥 Join response:', data);

      if (!res.ok) {
        setError(data.error || 'Failed to join');
        setLoading(false);
        return;
      }

      if (data.success) {
        setParticipant(data.participant);
        setShowJoinForm(false);
        setSuccessReferralCode(code);
        setShowSuccessModal(true); // ✅ Show modal (no alert!)
      }

    } catch (err: any) {
      console.error('❌ Join error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // --- NOT CONNECTED ---
  if (!address) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-lg mx-auto p-8 bg-gradient-to-br from-[#0052FF]/5 to-purple-500/5 dark:from-[#0052FF]/10 dark:to-purple-500/10 rounded-3xl shadow-2xl border-2 border-[#0052FF]/20">
        <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-500 drop-shadow-lg" />
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#0052FF] via-purple-600 to-pink-600 bg-clip-text text-transparent">
          BaseMatch Founding Race
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
          Top 100 win founding member NFTs<br/>
          Top 5 split 50 USDC
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            ⚡ Connect wallet to join the race
          </p>
        </div>
      </div>
    </div>
  );

  // --- LOADING ---
  if (loading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0052FF] mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading race...</p>
      </div>
    </div>
  );

  // --- NO PROFILE ERROR ---
  if (!hasProfile || (error && !showJoinForm)) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-md mx-auto p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-700">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-100">
          Profile Required
        </h2>
        <p className="text-red-700 dark:text-red-300 mb-6">
          {error || 'Create a profile to join the race'}
        </p>
        <button
          onClick={() => window.location.href = '/register/wallet/choice'}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-lg"
        >
          Create Profile Now
        </button>
      </div>
    </div>
  );

  // --- JOIN FORM ---
  if (showJoinForm) return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm mb-6 shadow-lg">
          🔥 LIMITED TIME - FOUNDING RACE
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0052FF] via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Join the Race
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Compete for founding member NFTs and prizes
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Top 100 Win NFTs</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Founding member benefits forever</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-blue-500" />
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Top 5 Split $50</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Cash prizes in USDC</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-purple-500" />
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Invite Friends</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">More invites = more points</p>
        </div>
      </div>

      {/* Join Form Box */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-[#0052FF]/20 max-w-2xl mx-auto mb-12">
        {/* Referral Code Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={joiningWithCode}
                onChange={(e) => {
                  setJoiningWithCode(e.target.checked);
                  if (!e.target.checked) setReferralCodeInput('');
                }}
                className="w-5 h-5 text-[#0052FF] rounded focus:ring-2 focus:ring-[#0052FF]"
              />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                🎁 I have a referral code
              </span>
            </label>
          </div>

          {joiningWithCode && (
            <div className="animate-in slide-in-from-top duration-300">
              <input
                type="text"
                placeholder="Enter code (e.g. ABC12345)"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full px-6 py-4 rounded-xl border-2 border-[#0052FF]/30 dark:border-[#0052FF]/50 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-2xl text-center focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-[#0052FF] transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Your friend gets credit when you join
              </p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleJoin}
          disabled={joiningWithCode && !referralCodeInput.trim()}
          className="w-full bg-gradient-to-r from-[#0052FF] to-[#5B8DEE] hover:from-[#0041CC] hover:to-[#4A7BD9] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-xl transition-all shadow-xl shadow-[#0052FF]/30 hover:shadow-2xl hover:scale-105 text-xl"
        >
          {joiningWithCode ? `🚀 Join with Code ${referralCodeInput}` : '🚀 Join the Race'}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          {joiningWithCode ? '✨ Your friend will get credit for inviting you' : '💡 Get your own referral code after joining'}
        </p>
      </div>

      {/* How It Works Section */}
      <div className="mt-12 bg-gradient-to-br from-[#0052FF]/5 to-purple-500/5 dark:from-[#0052FF]/10 dark:to-purple-500/10 rounded-2xl p-8 border border-[#0052FF]/20">
        <h3 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          How to Win
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#0052FF] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
            <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Invite 1 Friend</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Unlock check-ins by inviting 1 person</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#0052FF] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
            <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Check In Daily</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Earn points every 12 hours</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#0052FF] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
            <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Win Rewards</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Top 100 get NFTs, Top 5 get cash</p>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <SuccessModal
          referralCode={successReferralCode}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );

  // 🏆 MAIN RACE INTERFACE (Already Joined)
  return (
    <div className="max-w-7xl mx-auto px-4">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm mb-4">
          🏆 FOUNDING MEMBER RACE
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-[#0052FF] via-purple-600 to-pink-600 bg-clip-text text-transparent">
          BaseMatch Founding Race
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
          Top 100 on each leaderboard win founding member NFTs
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
          Top 5 on each leaderboard split 50 USDC
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Race ends: <span className="font-semibold text-red-600 dark:text-red-400">TBD</span>
        </p>
      </div>
      
      {/* Getting Started Banner */}
      {participant && (participant.invite_count || 0) < 1 && (
        <div className="mb-6 bg-gradient-to-r from-[#0052FF] to-[#5B8DEE] text-white rounded-2xl p-6 shadow-lg shadow-[#0052FF]/20">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Zap className="w-6 h-6" />
            <span>Getting Started</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
              <div>
                <p className="font-semibold mb-1">You're In!</p>
                <p className="text-white/90">You've joined the leaderboard</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <p className="font-semibold mb-1">👉 Invite 1 Friend</p>
                <p className="text-white/90">Share your code to unlock check-ins</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <p className="font-semibold mb-1">📈 Start Earning</p>
                <p className="text-white/90">Check in every 12 hours for points</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RankingsTable 
            gender={gender}
            setGender={setGender}
            myWallet={address}
          />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <CheckInButton walletAddress={address} />
          <InviteLink participant={participant} />
          <AutoCheckPurchase 
            walletAddress={address}
            participant={participant}
          />
        </div>
      </div>
      
      {/* Info Section */}
      <div className="mt-8 bg-gradient-to-br from-[#0052FF]/5 to-[#5B8DEE]/5 dark:from-[#0052FF]/10 dark:to-[#5B8DEE]/10 border border-[#0052FF]/20 dark:border-[#0052FF]/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          How It Works
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-[#0052FF] dark:text-[#5B8DEE] mb-1">1. Invite to Unlock</p>
            <p className="text-gray-700 dark:text-gray-300">
              Invite 1 person to unlock check-ins. More invites = bigger point multiplier
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0052FF] dark:text-[#5B8DEE] mb-1">2. Check In Daily</p>
            <p className="text-gray-700 dark:text-gray-300">
              Check in every 12 hours to earn points. Miss a window, lose those points forever.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0052FF] dark:text-[#5B8DEE] mb-1">3. Win NFT & Cash</p>
            <p className="text-gray-700 dark:text-gray-300">
              Top 5 split 50 USDC, Top 100 win founding member NFTs with lifetime benefits.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
