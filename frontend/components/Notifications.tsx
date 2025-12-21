'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAccount } from 'wagmi';
import { Heart, Clock, CheckCircle, DollarSign, MessageCircle, Gift, Trash2, AlertCircle, TrendingUp, TrendingDown, ArrowRight, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import DateConfirmationModal from './DateConfirmationModal';
import DateStakeAcceptModal from './DateStakeAcceptModal';
import RatingModal from './RatingModal';
import ChatWindow from './ChatWindow';
import { useProfile } from '@/hooks/useProfile'; // Add this import

export default function Notifications() {
  const { address } = useAccount();
  const { profile } = useProfile(); // Get current user's profile
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    clearRead
  } = useNotifications({
    userAddress: address,
    autoRefresh: true
  });

  // Modal states
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  const [showAcceptStakeModal, setShowAcceptStakeModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatMessage, setSelectedChatMessage] = useState<{ address: string; name: string } | null>(null);

  // Updated state for accepting stakes
  const [selectedStakeToAccept, setSelectedStakeToAccept] = useState<{
    stakeId: string;
    matchAddress: string;
    matchName: string;
    stakeAmount: string;
    meetingTime: number;
    notificationId: string;
  } | null>(null);

  // State for date confirmation
  const [selectedMatch, setSelectedMatch] = useState<{
    address: string;
    name: string;
    stakeId?: string;
    meetingTime?: number;
    stakeAmount?: string
  } | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle countdown timer for rating modal
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setShowRatingModal(true);
      setCountdown(null);
    }
  }, [countdown]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  // Handle clicking message notification to open chat
  const handleMessageClick = (notification: any) => {
    const senderAddress = notification.metadata?.sender_address || '';
    const senderName = notification.metadata?.sender_name || 'User';

    if (senderAddress) {
      setSelectedChatMessage({ address: senderAddress, name: senderName });
      setShowChatWindow(true);
      handleMarkAsRead(notification.id);
    }
  };

  // Handle closing chat window
  const handleChatClose = () => {
    setShowChatWindow(false);
    setSelectedChatMessage(null);
  };

  // Handle accepting a stake from notification
  const handleAcceptStake = (notification: any) => {
    const senderAddress = notification.metadata?.sender_address || '';
    const senderName = notification.metadata?.sender_name || 'User';
    const stakeId = notification.metadata?.stake_id || '0';
    const stakeAmount = notification.metadata?.stake_amount || '10';
    const meetingTime = notification.metadata?.meeting_timestamp || Math.floor(Date.now() / 1000);

    setSelectedStakeToAccept({
      stakeId,
      matchAddress: senderAddress,
      matchName: senderName,
      stakeAmount,
      meetingTime,
      notificationId: notification.id
    });
    setShowAcceptStakeModal(true);
    handleMarkAsRead(notification.id);
  };

  // Handle successful stake acceptance
  const handleStakeAccepted = () => {
    setShowAcceptStakeModal(false);
    setSelectedStakeToAccept(null);
    // Optionally show a success message or trigger a refresh
  };

  // Handle clicking "Confirm Date" button from notification
  const handleConfirmDateClick = (notification: any) => {
    const matchAddress = notification.metadata?.match_address || notification.metadata?.sender_address || '';
    const matchName = notification.metadata?.match_name || notification.metadata?.sender_name || 'Your match';
    const stakeId = notification.metadata?.stake_id || '0';
    const meetingTime = notification.metadata?.meeting_timestamp || Math.floor(Date.now() / 1000);
    const stakeAmount = notification.metadata?.stake_amount || '0';

    setSelectedMatch({ address: matchAddress, name: matchName, stakeId, meetingTime, stakeAmount });
    setShowDateConfirmation(true);
    handleMarkAsRead(notification.id);
  };

  // Handle date confirmation success
  const handleDateConfirmed = () => {
    setShowDateConfirmation(false);

    // If both users showed up, show rating modal after a brief moment
    // This logic should be handled by the DateConfirmationModal itself
    // but we can also trigger it here if needed
  };

  // Handle rating modal close
  const handleRatingClose = () => {
    setShowRatingModal(false);
    setSelectedMatch(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={24} className="text-white" />;
      case 'match':
        return <Heart size={24} className="text-white" />;
      case 'gift':
        return <Gift size={24} className="text-white" />;
      case 'profile_complete':
        return <CheckCircle size={24} className="text-white" />;
      case 'match_deleted':
        return <Trash2 size={24} className="text-white" />;
      case 'date_stake_created':
      case 'date_stake_accepted':
        return <Heart size={24} className="text-white" />;
      case 'date_confirmation_reminder':
        return <Clock size={24} className="text-white" />;
      case 'date_confirmed':
        return <CheckCircle size={24} className="text-white" />;
      case 'stake_processed':
        return <DollarSign size={24} className="text-white" />;
      default:
        return <Bell size={24} className="text-white" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'from-purple-500 to-pink-600';
      case 'match':
        return 'from-pink-500 to-red-600';
      case 'gift':
        return 'from-yellow-500 to-orange-600';
      case 'profile_complete':
        return 'from-gray-500 to-gray-600';
      case 'match_deleted':
        return 'from-gray-500 to-gray-600';
      case 'date_stake_created':
      case 'date_confirmation_reminder':
        return 'from-pink-500 to-purple-600';
      case 'date_stake_accepted':
      case 'date_confirmed':
        return 'from-green-500 to-emerald-600';
      case 'stake_processed':
        return 'from-blue-500 to-indigo-600';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  const renderStakeDetails = (notification: any) => {
    if (!notification.metadata) return null;

    const isStakeNotification = notification.type.startsWith('date_') || notification.type === 'stake_processed';
    if (!isStakeNotification) return null;

    const {
      stake_amount,
      meeting_timestamp,
      outcome,
      payout_amount,
      i_showed_up,
      they_showed_up
    } = notification.metadata;

    // Date Stake Created - Add "Accept Stake" button
    if (notification.type === 'date_stake_created') {
      const senderName = notification.metadata?.sender_name || 'Someone';

      return (
        <div className="mt-3 space-y-3">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3 border border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={16} className="text-pink-600" />
              <div className="text-sm font-semibold text-pink-900">
                {senderName}
              </div>
            </div>
            <div className="space-y-1 text-xs text-pink-700">
              <div className="flex justify-between">
                <span>Your stake:</span>
                <span className="font-semibold">{stake_amount} USDC</span>
              </div>
              {meeting_timestamp && (
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-semibold">{new Date(meeting_timestamp * 1000).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => handleAcceptStake(notification)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Accept & Stake
          </button>
        </div>
      );
    }

    // Date Confirmation Reminder - Add "Confirm Date" button
    if (notification.type === 'date_confirmation_reminder') {
      return (
        <div className="mt-3 space-y-3">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-orange-600" />
              <div className="text-sm font-semibold text-orange-900">
                Time to Confirm!
              </div>
            </div>
            <div className="text-xs text-orange-700">
              Your date was 48 hours ago. Please confirm what happened.
            </div>
          </div>
          <button
            onClick={() => handleConfirmDateClick(notification)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Confirm Date Now
          </button>
        </div>
      );
    }

    // Date Stake Accepted
    if (notification.type === 'date_stake_accepted') {
      const acceptorAddress = notification.metadata?.acceptor_address;

      return (
        <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <div className="text-sm font-semibold text-gray-900">
                  Date Confirmed!
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Both staked {stake_amount} USDC
              </div>
              {meeting_timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(meeting_timestamp * 1000).toLocaleString()}
                </div>
              )}
              {acceptorAddress && (
                <div className="text-xs text-green-700 mt-1">
                  Accepted by: {truncateAddress(acceptorAddress)}
                </div>
              )}
            </div>
            <div className="text-xs text-green-600 font-semibold">
              Active
            </div>
          </div>
        </div>
      );
    }

    // Date Confirmed
    if (notification.type === 'date_confirmed') {
      const outcomeMessages = {
        both_showed: { text: 'Both showed up!', icon: '🎉', color: 'green' },
        you_showed: { text: 'You showed, they didn\'t', icon: '💪', color: 'blue' },
        partner_showed: { text: 'They showed, you didn\'t', icon: '😞', color: 'orange' },
        neither_showed: { text: 'Neither showed up', icon: '😔', color: 'gray' },
        conflict: { text: 'Responses conflict', icon: '⚠️', color: 'yellow' }
      };

      const outcomeInfo = outcome ? outcomeMessages[outcome as keyof typeof outcomeMessages] : null;

      return (
        <div className={`mt-3 rounded-lg p-3 border ${outcomeInfo?.color === 'green' ? 'bg-green-50 border-green-200' :
          outcomeInfo?.color === 'blue' ? 'bg-blue-50 border-blue-200' :
            outcomeInfo?.color === 'orange' ? 'bg-orange-50 border-orange-200' :
              outcomeInfo?.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-gray-50 border-gray-200'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} />
            <div className="text-sm font-semibold">
              {outcomeInfo?.icon} {outcomeInfo?.text || 'Confirmed'}
            </div>
          </div>
          {(i_showed_up !== undefined && they_showed_up !== undefined) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">You: </span>
                <span className={i_showed_up ? 'text-green-700 font-semibold' : 'text-orange-700'}>
                  {i_showed_up ? '✅ Showed' : '❌ Didn\'t show'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Them: </span>
                <span className={they_showed_up ? 'text-green-700 font-semibold' : 'text-orange-700'}>
                  {they_showed_up ? '✅ Showed' : '❌ Didn\'t show'}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Stake Processed
    if (notification.type === 'stake_processed' && payout_amount) {
      const payoutValue = parseFloat(payout_amount);
      const stakeValue = parseFloat(stake_amount || '10');
      const isProfit = payoutValue > stakeValue;
      const isLoss = payoutValue < stakeValue;

      return (
        <div className={`mt-3 rounded-lg p-3 border ${isProfit ? 'bg-green-50 border-green-200' :
          isLoss ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className={
                isProfit ? 'text-green-600' :
                  isLoss ? 'text-red-600' :
                    'text-blue-600'
              } />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {payoutValue.toFixed(2)} USDC
                </div>
                <div className="text-xs text-gray-600">
                  {isProfit ? `+${(payoutValue - stakeValue).toFixed(2)} profit` :
                    isLoss ? `${(stakeValue - payoutValue).toFixed(2)} lost` :
                      'Even'}
                </div>
              </div>
            </div>
            <div className={`text-xs font-semibold flex items-center gap-1 ${isProfit ? 'text-green-700' :
              isLoss ? 'text-red-700' :
                'text-blue-700'
              }`}>
              {isProfit ? <><TrendingUp size={14} /> Bonus</> :
                isLoss ? <><TrendingDown size={14} /> Loss</> :
                  <><ArrowRight size={14} /> Refund</>
              }
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Countdown indicator */}
      {countdown !== null && countdown > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-4 text-center mb-4 animate-pulse">
          <div className="text-pink-700 font-bold text-lg flex items-center justify-center gap-2">
            <Clock size={20} className="animate-spin" /> Rating modal opening in {countdown} second{countdown !== 1 ? 's' : ''}...
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
            {notifications.some(n => n.read) && (
              <button
                onClick={clearRead}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="mb-4 flex justify-center">
            <Bell size={48} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</h3>
          <p className="text-gray-600">
            When you receive messages, matches, or date updates, they'll appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-200">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              className={`p-6 transition-colors cursor-pointer hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {notification.type === 'date_stake_created' && notification.metadata?.sender_name ? (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">{notification.metadata.sender_name}</span> wants to go on a date with you!
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      )}

                      {/* Stake-specific details with action buttons */}
                      {renderStakeDetails(notification)}

                      {/* Message notification button */}
                      {notification.type === 'message' && (
                        <button
                          onClick={() => handleMessageClick(notification)}
                          className="mt-3 w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                          Open Chat
                        </button>
                      )}

                      {notification.type === 'message' && notification.metadata?.sender_address && (
                        <p className="text-xs text-gray-500 mt-2">
                          From: {truncateAddress(notification.metadata.sender_address)}
                        </p>
                      )}
                      {notification.type === 'match' && notification.metadata?.match_name && (
                        <p className="text-xs text-gray-500 mt-2">
                          Matched with: {notification.metadata.match_name}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Window */}
      {showChatWindow && address && selectedChatMessage && (
        <ChatWindow
          user1Address={address}
          user2Address={selectedChatMessage.address}
          user1Name="You"
          user2Name={selectedChatMessage.name}
          currentUserAddress={address}
          onClose={handleChatClose}
        />
      )}

      {/* Date Stake Accept Modal */}
      {showAcceptStakeModal && selectedStakeToAccept && (
        <DateStakeAcceptModal
          stakeId={selectedStakeToAccept.stakeId}
          matchedUserName={selectedStakeToAccept.matchName}
          stakeAmount={selectedStakeToAccept.stakeAmount}
          meetingTime={selectedStakeToAccept.meetingTime}
          currentUserName={profile?.name || 'User'}
          onClose={() => setShowAcceptStakeModal(false)}
          onSuccess={handleStakeAccepted}
        />
      )}

      {/* Date Confirmation Modal */}
      {showDateConfirmation && selectedMatch && (
        <DateConfirmationModal
          stakeId={selectedMatch.stakeId || '0'}
          matchAddress={selectedMatch.address}
          matchName={selectedMatch.name}
          meetingTime={selectedMatch.meetingTime || Math.floor(Date.now() / 1000)}
          stakeAmount={selectedMatch.stakeAmount || '0'}
          onClose={() => setShowDateConfirmation(false)}
          onSuccess={handleDateConfirmed}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedMatch && (
        <RatingModal
          matchAddress={selectedMatch.address}
          onClose={handleRatingClose}
        />
      )}
    </div>
  );
}
