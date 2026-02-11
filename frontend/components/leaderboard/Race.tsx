'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CheckInButton } from './CheckInButton';
import { InviteLink } from './InviteLink';
import { RankingsTable } from './RankingsTable';
import { AutoCheckPurchase } from './AutoCheckPurchase';
import { Trophy, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

type OnboardingState = 'loading' | 'not_joined' | 'joined' | 'error';

export default function Race() {
  const { address } = useAccount();
  
  const [participant, setParticipant] = useState<any>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [isJoining, setIsJoining] = useState(false);
  
  useEffect(() => {
    if (address) {
      autoJoinLeaderboard();
    } else {
      setOnboardingState('not_joined');
    }
  }, [address]);
  
  async function autoJoinLeaderboard() {
    setOnboardingState('loading');
    setErrorMessage('');
    
    try {
      // Check URL for referral code
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref');
      
      const res = await fetch('/api/leaderboard/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          referralCode: referralCode || null
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.needsProfile) {
          setErrorMessage('Please create your profile first at /profile');
          setOnboardingState('error');
          return;
        }
        
        setErrorMessage(data.error || 'Failed to join leaderboard');
        setOnboardingState('error');
        return;
      }
      
      if (data.success) {
        setParticipant(data.participant);
        setOnboardingState('joined');
        
        // Show success message if newly joined
        if (!data.alreadyJoined) {
          // Show notification based on whether they were referred
          if (referralCode) {
            showNotification('✅ Successfully joined via referral! Share your link to unlock check-ins.');
          } else {
            showNotification('✅ Welcome to the race! Share your invite link with 1 friend to unlock check-ins.');
          }
        }
      } else {
        setErrorMessage('Unexpected response from server');
        setOnboardingState('error');
      }
    } catch (error) {
      console.error('Auto-join error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setOnboardingState('error');
    }
  }
  
  function showNotification(message: string) {
    // You can replace this with a proper toast library like react-hot-toast
    alert(message);
  }
  
  async function handleManualJoin() {
    setIsJoining(true);
    await autoJoinLeaderboard();
    setIsJoining(false);
  }
  
  // Not connected to wallet
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Top 100 on each leaderboard win free NFTs
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Click "Connect Wallet" in the top right to get started →
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (onboardingState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 font-semibold">Joining leaderboard...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (onboardingState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-700">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
          <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-100 text-center">
            Unable to Join
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6 text-center">
            {errorMessage}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleManualJoin}
              disabled={isJoining}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {isJoining ? 'Retrying...' : 'Try Again'}
            </button>
            {errorMessage.includes('profile') && (
              <a
                href="/profile"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Create Profile
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Successfully joined - show main interface
return (
    <div className="max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm mb-4">
          🏆 FOUNDING MEMBER RACE
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          BaseMatch Founding Race
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
          Top 100 on each leaderboard win founding member NFTs
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Race ends: <span className="font-semibold text-red-600 dark:text-red-400">February 28, 2026 at 11:59 PM EST</span>
        </p>
      </div>
      
      {/* NEW: How to Start Banner */}
      {participant && participant.invite_count < 1 && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span>🎯</span>
            <span>Getting Started</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <p className="font-semibold mb-1">✅ You're In!</p>
                <p className="text-white/90">You've joined the leaderboard</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <p className="font-semibold mb-1">👉 Invite 1 Friend</p>
                <p className="text-white/90">Share your link to unlock check-ins</p>
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
        
        {/* Left Column - User Actions */}
        <div className="lg:col-span-1 space-y-6">
          <CheckInButton walletAddress={address} />
          <InviteLink participant={participant} />
          <AutoCheckPurchase 
            walletAddress={address}
            participant={participant}
          />
        </div>
        
        {/* Right Column - Leaderboard */}
        <div className="lg:col-span-2">
          <RankingsTable 
            gender={gender}
            setGender={setGender}
            myWallet={address}
          />
        </div>
        
      </div>
      
      {/* Info Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
          How It Works
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">1. Invite to Unlock</p>
            <p className="text-blue-600 dark:text-blue-400">
              Invite 1 person to unlock check-ins. More invites = bigger point multiplier.
            </p>
          </div>
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">2. Check In Daily</p>
            <p className="text-blue-600 dark:text-blue-400">
              Check in every 12 hours (morning & night) to earn points. Miss a window, lose those points forever.
            </p>
          </div>
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Win NFT</p>
            <p className="text-blue-600 dark:text-blue-400">
              Top 100 on your gender's leaderboard win a founding member NFT with lifetime benefits.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
