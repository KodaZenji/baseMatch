'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckInButton } from './CheckInButton';
import { InviteLink } from './InviteLink';
import { RankingsTable } from './RankingsTable';
import { AutoCheckPurchase } from './AutoCheckPurchase';
import { Trophy } from 'lucide-react';

export default function Race() {
  const { address } = useAccount();
  
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  
  useEffect(() => {
    if (address) {
      checkProfileAndJoin();
    }
  }, [address]);
  
  async function checkProfileAndJoin(manualReferralCode?: string) {
    setLoading(true);
    setError(null);
    
    try {
      const profileStatusRes = await fetch('/api/profile/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const profileStatus = await profileStatusRes.json();
      
      if (!profileStatus.profileExists) {
        setHasProfile(false);
        setError('Please create a profile first before joining the race.');
        setLoading(false);
        return;
      }
      
      setHasProfile(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const urlReferralCode = urlParams.get('ref');
      const referralCode = manualReferralCode || urlReferralCode || null;
      
      const res = await fetch('/api/leaderboard/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          referralCode
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Join error:', data);
        setError(data.error || 'Failed to join leaderboard');
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setParticipant(data.participant);
        setShowReferralInput(false);
        
        if (!data.alreadyJoined && referralCode) {
          alert(`✅ Successfully joined with code ${referralCode}!\n\nInvite 1 person to unlock check-ins.`);
        } else if (!data.alreadyJoined) {
          setShowReferralInput(true);
        }
      } else {
        setError(data.error || 'Unknown error');
      }
      
    } catch (error: any) {
      console.error('Auto-join error:', error);
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  function handleReferralCodeSubmit() {
    const code = referralCodeInput.trim().toUpperCase();
    if (!code) {
      alert('Please enter a referral code');
      return;
    }
    checkProfileAndJoin(code);
  }
  
  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            🏆 BaseMatch Founding Race
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your wallet to join the race for founding member NFTs
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Top 100 on each leaderboard win free NFTs
          </p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0052FF] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking your profile...</p>
        </div>
      </div>
    );
  }
  
  if (!hasProfile || error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-700">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-100">
            Unable to Join
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error || 'Please create a profile first'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/register/wallet/choice'}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Create Profile
            </button>
            <button
              onClick={() => checkProfileAndJoin()}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm mb-4">
          🏆 FOUNDING MEMBER RACE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-[#0052FF] via-purple-600 to-pink-600 bg-clip-text text-transparent">
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
      
      {/* Referral Code Input */}
      {showReferralInput && participant && !participant.referred_by && (
        <div className="mb-6 bg-gradient-to-br from-[#0052FF]/5 to-purple-500/5 dark:from-[#0052FF]/10 dark:to-purple-500/10 border-2 border-[#0052FF]/30 dark:border-[#0052FF]/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
             Got a Referral Code?
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            If someone referred you, enter their code below to give them credit!
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter code (e.g. ABC12345)"
              value={referralCodeInput}
              onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-[#0052FF]/30 dark:border-[#0052FF]/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-[#0052FF]"
            />
            <button
              onClick={handleReferralCodeSubmit}
              className="bg-[#0052FF] hover:bg-[#0041CC] text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-lg shadow-[#0052FF]/20"
            >
              Apply Code
            </button>
          </div>
          <button
            onClick={() => setShowReferralInput(false)}
            className="mt-3 text-sm text-[#0052FF] dark:text-[#5B8DEE] hover:underline"
          >
            Skip - I wasn't referred
          </button>
        </div>
      )}
      
      {/* Getting Started Banner */}
      {participant && (participant.invite_count || 0) < 1 && (
        <div className="mb-6 bg-gradient-to-r from-[#0052FF] to-[#5B8DEE] text-white rounded-2xl p-6 shadow-lg shadow-[#0052FF]/20">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span></span>
            <span>Getting Started</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <p className="font-semibold mb-1">You're In!</p>
                <p className="text-white/90">You've joined the leaderboard</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <p className="font-semibold mb-1">👉 Invite 1 Friend</p>
                <p className="text-white/90">Share your code to unlock check-ins</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
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
              Check in every 12 hours (morning & night) to earn points. Miss a window, lose those points forever.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0052FF] dark:text-[#5B8DEE] mb-1">3. Win NFT</p>
            <p className="text-gray-700 dark:text-gray-300">
              Top 5 on each leaderboard split 50 USDC AND
              Top 100 on your gender's leaderboard win a founding member NFT with lifetime benefits.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
