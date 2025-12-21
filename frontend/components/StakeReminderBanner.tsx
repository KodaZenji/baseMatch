'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Clock, AlertCircle, Heart, X, HourglassIcon } from 'lucide-react';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';

interface PendingStake {
  stakeId: string;
  matchAddress: string;
  matchName: string;
  meetingTime: number;
  stakeAmount: string;
  deadline?: number;
  timeRemaining?: number;
  timeWaiting?: number;
  timeUntilMeeting?: number;
  canCancel?: boolean;
  role?: 'creator' | 'acceptor';
}

interface StakeReminderBannerProps {
  onConfirmClick: (stake: PendingStake) => void;
  onAcceptClick?: (stake: PendingStake) => void;
}

export default function StakeReminderBanner({ onConfirmClick, onAcceptClick }: StakeReminderBannerProps) {
  const { address } = useAccount();
  const [waitingStakes, setWaitingStakes] = useState<PendingStake[]>([]);
  const [confirmationStakes, setConfirmationStakes] = useState<PendingStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Add wagmi hooks for contract interaction
  const { writeContract: writeStakingContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash
  });

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

      const response = await fetch(`/api/stakes/pending?address=${address}`);
      const data = await response.json();

      if (data.success) {
        setWaitingStakes(data.waitingForAcceptance || []);
        setConfirmationStakes(data.needingConfirmation || []);
      } else {
        console.error('Error fetching stakes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching pending stakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelStake = async (stakeId: string) => {
    if (!confirm('Are you sure you want to cancel this stake? Your USDC will be returned.')) {
      return;
    }

    setCancelling(stakeId);

    try {
      // Call smart contract directly to cancel stake using wagmi
      writeStakingContract({
        chainId: 84532, // Base Sepolia
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'cancelStake',
        args: [BigInt(stakeId)]
      });
    } catch (error) {
      console.error('Error cancelling stake:', error);
      alert('Failed to cancel stake. Please try again.');
      setCancelling(null);
    }
  };

  // Update the useEffect to handle both cancel and expired stake operations
  useEffect(() => {
    const updateDatabaseAfterSuccess = async (stakeId: string, isExpired: boolean = false) => {
      try {
        // After blockchain confirms, update database
        const response = await fetch('/api/stakes/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stakeId,
            userAddress: address,
            expired: isExpired
          })
        });

        const data = await response.json();
        if (data.success) {
          setWaitingStakes(prev => prev.filter(s => s.stakeId !== stakeId));
        }
      } catch (error) {
        console.error('Error updating database after stake processing:', error);
      }
    };

    // Only call API after successful transaction
    if (isTxSuccess && txHash && cancelling) {
      // Find the stake ID that was being processed
      const processedStake = waitingStakes.find(s => cancelling === s.stakeId);
      if (processedStake) {
        // Determine if this was an expired stake operation
        const isExpiredOperation = (processedStake.timeUntilMeeting || 0) <= 0;
        updateDatabaseAfterSuccess(processedStake.stakeId, isExpiredOperation);
      }
      setCancelling(null);
      fetchPendingStakes(); // Refresh the stakes list
    }
  }, [isTxSuccess, txHash, cancelling, waitingStakes, address]);

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const formatTimeWaiting = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
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
  if (waitingStakes.length === 0 && confirmationStakes.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {/* CATEGORY 1: Waiting for Acceptance */}
      {waitingStakes.map(stake => {
        const meetingDate = new Date(stake.meetingTime * 1000);
        const isExpiringSoon = (stake.timeUntilMeeting || 0) < 24 * 60 * 60; // Less than 24 hours

        return (
          <div
            key={stake.stakeId}
            className={`rounded-xl p-4 border-2 ${isExpiringSoon
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400'
              : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
              }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl">
                  {isExpiringSoon ? (
                    <AlertCircle className="text-orange-600" size={32} />
                  ) : (
                    <HourglassIcon className="text-blue-600" size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {stake.role === 'creator'
                      ? `Waiting for ${stake.matchName} to accept`
                      : `${stake.matchName} invited you to a date`
                    }
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Date scheduled: {meetingDate.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className={isExpiringSoon ? 'text-orange-600' : 'text-blue-600'} />
                    <p className={`text-xs font-semibold ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
                      {stake.role === 'creator'
                        ? `Expires in ${formatTimeRemaining(stake.timeUntilMeeting || 0)}`
                        : `Accept within ${formatTimeRemaining(stake.timeUntilMeeting || 0)}`
                      }
                    </p>
                  </div>
                  {isExpiringSoon && (
                    <p className="text-xs text-orange-600 font-semibold mt-1">
                      ⚠️ Stake will expire if not accepted by meeting time!
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Stake: {stake.stakeAmount} USDC
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {stake.role === 'creator' && stake.canCancel && (
                  <>
                    {(stake.timeUntilMeeting || 0) <= 0 ? (
                      // FIXED: Meeting time passed and user2 never accepted - use cancelStake to get refund
                      <button
                        onClick={() => handleCancelStake(stake.stakeId)}
                        disabled={cancelling === stake.stakeId || isTxPending || isTxConfirming}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
                      >
                        {(cancelling === stake.stakeId || isTxPending || isTxConfirming) ? 'Processing...' : 'Claim Refund'}
                      </button>
                    ) : (
                      // Before meeting time - show "Cancel"
                      <button
                        onClick={() => handleCancelStake(stake.stakeId)}
                        disabled={cancelling === stake.stakeId}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        <X size={16} />
                        {cancelling === stake.stakeId ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </>
                )}
                {stake.role === 'acceptor' && onAcceptClick && (stake.timeUntilMeeting || 0) > 0 && (
                  <button
                    onClick={() => onAcceptClick(stake)}
                    className={`px-6 py-3 rounded-lg font-semibold hover:opacity-90 ${isExpiringSoon
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white animate-pulse'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      }`}
                  >
                    {isExpiringSoon ? 'Accept Now!' : 'Accept Stake'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* CATEGORY 2: Need Confirmation */}
      {confirmationStakes.map(stake => {
        const isUrgent = (stake.timeRemaining || 0) < 6 * 60 * 60; // Less than 6 hours

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
                    <p className={`text-xs font-semibold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatTimeRemaining(stake.timeRemaining || 0)} remaining to confirm
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
