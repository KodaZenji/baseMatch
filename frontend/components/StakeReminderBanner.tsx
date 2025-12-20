'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Clock, AlertCircle, Heart } from 'lucide-react';

interface PendingStake {
  stakeId: string;
  matchAddress: string;
  matchName: string;
  meetingTime: number;
  stakeAmount: string;
  deadline: number;
  timeRemaining: number;
}

interface StakeReminderBannerProps {
  onConfirmClick: (stake: PendingStake) => void;
}

export default function StakeReminderBanner({ onConfirmClick }: StakeReminderBannerProps) {
  const { address } = useAccount();
  const [pendingStakes, setPendingStakes] = useState<PendingStake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    fetchPendingStakes();

    // Refresh every minute
    const interval = setInterval(fetchPendingStakes, 60000);
    return () => clearInterval(interval);
  }, [address]);

  const fetchPendingStakes = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Call API instead of direct database access
      const response = await fetch(`/api/stakes/pending?address=${address}`);
      const data = await response.json();

      if (data.success) {
        setPendingStakes(data.stakes);
      } else {
        console.error('Error fetching stakes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching pending stakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  if (loading) return null;
  if (pendingStakes.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {pendingStakes.map(stake => {
        const isUrgent = stake.timeRemaining < 6 * 60 * 60; // Less than 6 hours

        return (
          <div
            key={stake.stakeId}
            className={`rounded-xl p-4 border-2 transition-all ${isUrgent
                ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 animate-pulse'
                : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300'
              }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl">
                  {isUrgent ? <AlertCircle className="text-red-600" size={32} /> : <Clock className="text-orange-600" size={32} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">
                      {isUrgent && 'URGENT: '}Time to confirm your date!
                    </p>
                    {isUrgent && (
                      <AlertCircle className="text-red-600" size={20} />
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    Your date with {stake.matchName} was {formatTimeAgo(stake.meetingTime)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className={isUrgent ? 'text-red-600' : 'text-orange-600'} />
                    <p className={`text-xs font-semibold ${isUrgent ? 'text-red-600' : 'text-orange-600'
                      }`}>
                      {formatTimeRemaining(stake.timeRemaining)} remaining to confirm
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Stake: {stake.stakeAmount} USDC
                  </p>
                </div>
              </div>
              <button
                onClick={() => onConfirmClick(stake)}
                className={`px-6 py-3 rounded-lg font-semibold hover:opacity-90 whitespace-nowrap transition-all ${isUrgent
                    ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  }`}
              >
                Confirm Now
              </button>
            </div>

            {/* Compassionate Reminder */}
            <div className="mt-3 p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-700 flex items-center gap-2">
                <Heart className="text-pink-500" size={16} />
                <strong>Reminder:</strong> If you showed up, you'll get 95-142.5% back.
                If you couldn't make it, you'll still get 20% back (life happens).
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
