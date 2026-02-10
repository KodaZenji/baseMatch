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
    if (status?.nextCheckInMinutes > 0) {
      const interval = setInterval(() => {
        const hours = Math.floor(status.nextCheckInMinutes / 60);
        const minutes = status.nextCheckInMinutes % 60;
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
  
  if (status.needsInvite) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-2 text-blue-900 dark:text-blue-100">
          🔒 Check-Ins Locked
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Invite at least 1 person to unlock daily check-ins
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Share your invite link below ⬇️
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-4">Daily Check-In</h3>
      
      {status.canCheckIn ? (
        <div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Current window: <span className="font-semibold capitalize">{status.currentWindow}</span>
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              +{status.checkInValue} points
            </p>
          </div>
          
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
