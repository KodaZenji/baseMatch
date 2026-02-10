'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Lock, Clock, Zap } from 'lucide-react';

interface CheckInButtonProps {
  walletAddress: string;
}

export function CheckInButton({ walletAddress }: CheckInButtonProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const totalMinutes = status.nextCheckInMinutes;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setCountdown(`${hours}h ${minutes}m`);
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [status]);
  
  async function fetchStatus() {
    try {
      setError(null);
      const res = await fetch(`/api/leaderboard/checkin?wallet=${walletAddress}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to fetch status');
        setStatus(null);
        return;
      }
      
      setStatus(data);
    } catch (error) {
      console.error('Fetch status error:', error);
      setError('Network error. Please try again.');
    }
  }
  
  async function handleCheckIn() {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/leaderboard/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Success notification
        alert(`✅ Check-in successful!\n+${data.points} points\nStreak: ${data.streak} days 🔥`);
        await fetchStatus(); // Refresh status
      } else if (data.requiresInvite) {
        // User needs to invite someone
        setError('You must invite at least 1 person before checking in');
      } else if (data.needsJoin) {
        // User needs to join leaderboard
        setError('Please join the leaderboard first');
      } else {
        setError(data.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setError('Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  // Loading state
  if (!status && !error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state - Not joined leaderboard
  if (error || status?.needsJoin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
              Not Joined Leaderboard
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              {error || 'You need to join the leaderboard first.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Refresh to Join
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Locked state - Needs to invite someone first
  if (status.needsInvite || status.inviteCount < 1) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-1">
              Check-Ins Locked
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Invite at least <span className="font-bold">1 person</span> to unlock daily check-ins and start earning points
            </p>
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-purple-700 dark:text-purple-300">Invites Progress</span>
            <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
              {status.inviteCount || 0} / 1
            </span>
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((status.inviteCount || 0) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          <span>👇</span>
          <span className="font-semibold">Share your invite link below to get started</span>
        </div>
      </div>
    );
  }
  
  // Active check-in state
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Daily Check-In
      </h3>
      
      {status.canCheckIn ? (
        <div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Current window:
              </span>
              <span className="text-sm font-semibold capitalize bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                {status.currentWindow}
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">You'll earn</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                +{status.checkInValue} points
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Checking in...
              </span>
            ) : (
              '✅ Check In Now'
            )}
          </button>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            Check in every 12 hours to maintain your streak
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 mb-4 border border-yellow-100 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                Next check-in available in:
              </p>
            </div>
            <p className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {countdown || 'Calculating...'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              You've already checked in this window. Come back later!
            </p>
          </div>
        </div>
      )}
      
      {/* Stats Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Your Stats
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Points</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {status.totalPoints?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Streak</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {status.streak || 0} 🔥
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invites</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {status.inviteCount || 0}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-in Value</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              +{status.checkInValue}
            </p>
          </div>
        </div>
      </div>
      
      {/* Auto-Check Badge */}
      {status.autoCheckEnabled && (
        <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                Auto-Check Enabled
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Expires: {new Date(status.autoCheckExpiry).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message if any */}
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
