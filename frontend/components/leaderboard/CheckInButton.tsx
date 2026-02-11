'use client';

import { useState, useEffect } from 'react';

interface CheckInButtonProps {
  walletAddress: string;
}

export function CheckInButton({ walletAddress }: CheckInButtonProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState('');
  
  useEffect(() => {
    if (walletAddress) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [walletAddress]);
  
  useEffect(() => {
    if (status && status.nextCheckInMinutes > 0) {
      const interval = setInterval(() => {
        const totalMinutes = status.nextCheckInMinutes;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setCountdown(`${hours}h ${minutes}m`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [status]);
  
  async function fetchStatus() {
    try {
      const res = await fetch(`/api/leaderboard/checkin?wallet=${walletAddress}`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Fetch status error:', error);
    }
  }
  
  async function handleCheckIn() {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Check-in successful!\n+${data.points} points\nStreak: ${data.streak} days 🔥`);
        fetchStatus();
      } else {
        alert(data.error || 'Check-in failed');
      }
    } catch (error) {
      alert('Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (status.needsJoin) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200">
          Refresh the page to join the leaderboard
        </p>
      </div>
    );
  }
  
  // 🔒 LOCKED STATE - Need to invite 1 person first
  if (status.needsInvite || status.inviteCount < 1) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-300 dark:border-blue-600 rounded-lg p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Check-Ins Locked 🔒
          </h3>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Invite <span className="font-bold text-blue-600 dark:text-blue-400">1 person</span> to unlock daily check-ins
          </p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your Invites:</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {status.inviteCount || 0} / 1
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((status.inviteCount || 0) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Share your invite link below ⬇️
          </p>
        </div>
      </div>
    );
  }
  
  // ✅ UNLOCKED - Can check in
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-4">Daily Check-In</h3>
      
      {status.canCheckIn ? (
        <div>
          <div className="bg-gradient-to-r from-[#0052FF]/10 to-[#5B8DEE]/10 dark:from-[#0052FF]/20 dark:to-[#5B8DEE]/20 rounded-lg p-4 mb-4 border border-[#0052FF]/20">
  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
    Current window: <span className="font-semibold capitalize">{status.currentWindow}</span>
  </p>
  <p className="text-2xl font-bold text-[#0052FF] dark:text-[#5B8DEE]">
    +{status.checkInValue} points
  </p>
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    Based on {status.inviteCount} invite{status.inviteCount !== 1 ? 's' : ''}
  </p>
</div>          
          <button
  onClick={handleCheckIn}
  disabled={loading}
  className="w-full bg-gradient-to-r from-[#0052FF] to-[#5B8DEE] hover:from-[#0041CC] hover:to-[#4A7BD9] text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-[#0052FF]/20"
>
  {loading ? 'Checking in...' : '✅ Check In Now'}
</button>
        </div>
      ) : (
        <div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
            <p className="text-yellow-700 dark:text-yellow-300 font-semibold mb-2">
              ⏰ Next check-in in:
            </p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {countdown}
            </p>
          </div>
          <p className="text-sm text-gray-500 text-center">
            You've already checked in this window
          </p>
        </div>
      )}
      
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Points:</span>
          <span className="font-bold">{status.totalPoints?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Streak:</span>
          <span className="font-bold">{status.streak || 0} days 🔥</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Invites:</span>
          <span className="font-bold">{status.inviteCount || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Check-in Value:</span>
          <span className="font-bold text-blue-600">+{status.checkInValue} pts</span>
        </div>
      </div>
      
      {status.autoCheckEnabled && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300 font-semibold">
            ⚡ Auto-Check Enabled
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Expires: {new Date(status.autoCheckExpiry).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
