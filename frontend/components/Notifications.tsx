'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAccount } from 'wagmi';
import { Heart, Clock, CheckCircle, DollarSign, X } from 'lucide-react';

export default function Notifications() {
  const { address } = useAccount();
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
        return '💬';
      case 'match':
        return '💖';
      case 'gift':
        return '🎁';
      case 'profile_complete':
        return '☑️';
      case 'match_deleted':
        return '🗑️';
      // Stake notifications
      case 'date_stake_created':
        return '💕';
      case 'date_stake_accepted':
        return '✅';
      case 'date_confirmation_reminder':
        return '⏰';
      case 'date_confirmed':
        return '✅';
      case 'stake_processed':
        return '💰';
      default:
        return '🔔';
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
      // Stake notifications
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

    // Date Stake Created/Accepted
    if (notification.type === 'date_stake_created' || notification.type === 'date_stake_accepted') {
      return (
        <div className="mt-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3 border border-pink-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-pink-600" />
                <div className="text-sm font-semibold text-gray-900">
                  {stake_amount} USDC Stake
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {meeting_timestamp && `Date: ${new Date(meeting_timestamp * 1000).toLocaleString()}`}
              </div>
            </div>
            <div className="text-xs text-pink-600 font-semibold">
              Active
            </div>
          </div>
        </div>
      );
    }

    // Date Confirmation Reminder
    if (notification.type === 'date_confirmation_reminder') {
      return (
        <div className="mt-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-orange-600" />
            <div className="text-sm font-semibold text-orange-900">
              Time to Confirm!
            </div>
          </div>
          <div className="text-xs text-orange-700">
            Your date was 1 hour ago. Please confirm what happened.
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
        <div className={`mt-3 rounded-lg p-3 border ${
          outcomeInfo?.color === 'green' ? 'bg-green-50 border-green-200' :
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

    // Stake Processed (Payout)
    if (notification.type === 'stake_processed' && payout_amount) {
      const payoutValue = parseFloat(payout_amount);
      const stakeValue = parseFloat(stake_amount || '10');
      const isProfit = payoutValue > stakeValue;
      const isLoss = payoutValue < stakeValue;

      return (
        <div className={`mt-3 rounded-lg p-3 border ${
          isProfit ? 'bg-green-50 border-green-200' :
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
            <div className={`text-xs font-semibold ${
              isProfit ? 'text-green-700' :
              isLoss ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {isProfit ? '📈 Bonus' :
               isLoss ? '📉 Loss' :
               '➡️ Refund'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderGiftDetails = (notification: any) => {
    if (notification.type !== 'gift' || !notification.metadata) return null;

    const { gift_type, crypto_type, amount, gift_name, gift_emoji, tx_hash, order_id } = notification.metadata;

    return (
      <div className="mt-3 space-y-2">
        {gift_type === 'crypto' && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {gift_emoji || '🪙'} {amount} {crypto_type?.toUpperCase()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Crypto Gift Received
                </div>
              </div>
              {tx_hash && (
                <a
                  href={`https://basescan.org/tx/${tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View TX
                </a>
              )}
            </div>
          </div>
        )}

        {gift_type === 'physical' && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{gift_emoji || '📦'}</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {gift_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Physical Gift • Delivery in 2-7 days
                  </div>
                </div>
              </div>
              {order_id && (
                <div className="text-xs text-gray-500">
                  Order #{order_id.slice(0, 8)}
                </div>
              )}
            </div>
          </div>
        )}

        {notification.metadata.sender_address && (
          <div className="text-xs text-gray-500">
            From: {truncateAddress(notification.metadata.sender_address)}
          </div>
        )}
      </div>
    );
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
          <div className="text-4xl mb-4">🔔</div>
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
              className={`p-6 transition-colors cursor-pointer hover:bg-gray-50 ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center text-2xl`}>
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
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      {/* Stake-specific details */}
                      {renderStakeDetails(notification)}
                      
                      {/* Gift details */}
                      {renderGiftDetails(notification)}
                      
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
    </div>
  );
}
