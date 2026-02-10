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
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
  useEffect(() => {
    if (address) {
      autoJoinLeaderboard();
    }
  }, [address]);
  
  async function autoJoinLeaderboard() {
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
      
      if (data.success) {
        setParticipant(data.participant);
        
        // If they just joined via referral, show notification
        if (!data.alreadyJoined && referralCode) {
          // You can replace this with a toast notification
          console.log('✅ Joined via referral!');
        }
      }
    } catch (error) {
      console.error('Auto-join error:', error);
    } finally {
      setLoading(false);
    }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Joining leaderboard...</p>
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
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          BaseMatch Founding Race
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
          Top 100 on each leaderboard win founding member NFTs
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Race ends: <span className="font-semibold text-red-600 dark:text-red-400">TBD</span>
        </p>
      </div>
      
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
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">1. Invite Friends</p>
            <p className="text-blue-600 dark:text-blue-400">
              Share your invite link. Each friend who joins boosts your check-in points.
            </p>
          </div>
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">2. Check In Daily</p>
            <p className="text-blue-600 dark:text-blue-400">
              Check in every 12 hours to earn points. More invites = more points per check-in.
            </p>
          </div>
          <div>
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">3. Win NFT</p>
            <p className="text-blue-600 dark:text-blue-400">
              Top 100 on your gender's leaderboard win a founding member NFT with exclusive perks.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
