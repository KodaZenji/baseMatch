'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import DateStakeModal from './DateStakeModal';

interface ChatWindowProps {
    user1Address: string;
    user2Address: string;
    user1Name: string;
    user2Name: string;
    currentUserAddress: string;
    onClose: () => void;
}

export default function ChatWindow({
    user1Address,
    user2Address,
    user1Name,
    user2Name,
    currentUserAddress,
    onClose,
}: ChatWindowProps) {
    const { messages, loading, error, isSending, hasMore, sendMessage, deleteMessage, loadMore } = useChat({
        user1Address,
        user2Address,
        userAddress: currentUserAddress,
        messagesPerPage: 50,
    });

    const [messageText, setMessageText] = useState('');
    const [sendError, setSendError] = useState<string | null>(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isInitialLoadRef = useRef(true);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isInitialLoadRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
            isInitialLoadRef.current = false;
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendError(null);

        if (!messageText.trim()) {
            setSendError('Message cannot be empty');
            return;
        }

        const success = await sendMessage(messageText);
        if (success) {
            setMessageText('');
            setSendError(null);
            scrollToBottom();
        } else {
            setSendError('Failed to send message. Please try again.');
        }
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container || loading || !hasMore) return;

        if (container.scrollTop === 0) {
            loadMore();
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Delete this message? This cannot be undone.')) return;

        setDeletingMessageId(messageId);
        setLongPressMessageId(null);
        const success = await deleteMessage(messageId);

        if (success) {
            setSuccessMessage('Message deleted');
            setTimeout(() => setSuccessMessage(''), 2000);
        } else {
            setSendError('Failed to delete message');
            setTimeout(() => setSendError(null), 3000);
        }
        setDeletingMessageId(null);
    };

    // Long press handlers for mobile
    const handleTouchStart = (messageId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            setLongPressMessageId(messageId);
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const otherUserName = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Name : user1Name;
    const otherUserAddress = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Address : user1Address;
    const currentUserName = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user1Name : user2Name;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* FIXED HEADER - Mobile responsive */}
                <div className="border-b border-gray-200 p-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 truncate">{otherUserName}</h2>
                            <p className="text-xs text-gray-500 truncate">{otherUserAddress}</p>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            <button
                                onClick={() => setShowDateModal(true)}
                                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm leading-tight"
                            >
                                <span className="hidden sm:inline whitespace-nowrap">💕 Go on a Date</span>
                                <span className="sm:hidden flex flex-col items-center">
                                    <span>Go on</span>
                                    <span>a Date 💕</span>
                                </span>
                            </button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-3xl sm:text-2xl leading-none p-1 -mr-1 min-w-[32px] flex items-center justify-center"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700">
                    🔒 End-to-end encrypted - Only you and your match can read these messages
                </div>

                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                    style={{ display: 'flex', flexDirection: 'column-reverse' }}
                >
                    <div ref={messagesEndRef} />

                    {loading && messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500 text-center">
                                <div className="mb-2">Loading messages...</div>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500 text-center">
                                <div className="mb-2">No messages yet</div>
                                <div className="text-sm">Start the conversation! 💬</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.slice().reverse().map((msg) => {
                                const isCurrentUser = msg.sender_address.toLowerCase() === currentUserAddress.toLowerCase();
                                const isDeleting = deletingMessageId === msg.id;
                                const showDeleteButton = longPressMessageId === msg.id;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}
                                    >
                                        <div className="relative flex items-center gap-2">
                                            {/* Delete button - shows on hover (desktop) or long-press (mobile) */}
                                            {isCurrentUser && !isDeleting && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className={`
                                                        text-red-500 hover:text-red-700 text-lg flex-shrink-0 transition-opacity
                                                        ${showDeleteButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                    `}
                                                    title="Delete message"
                                                >
                                                    🗑️
                                                </button>
                                            )}

                                            <div
                                                onTouchStart={() => isCurrentUser && !isDeleting && handleTouchStart(msg.id)}
                                                onTouchEnd={handleTouchEnd}
                                                onTouchMove={handleTouchEnd}
                                                className={`
                                                    max-w-xs px-4 py-2 rounded-lg cursor-pointer select-none
                                                    ${isCurrentUser
                                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                                                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                                    } 
                                                    ${isDeleting ? 'opacity-50' : ''}
                                                    ${showDeleteButton ? 'scale-95' : ''}
                                                    transition-transform
                                                `}
                                            >
                                                <p className="break-words">{msg.decrypted_text || '[Decrypting...]'}</p>
                                                <p
                                                    className={`text-xs mt-1 ${isCurrentUser ? 'text-pink-100' : 'text-gray-500'
                                                        }`}
                                                >
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {hasMore && (
                        <div className="text-center py-2">
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : '↑ Load older messages'}
                            </button>
                        </div>
                    )}
                </div>

                {(error || sendError || successMessage) && (
                    <div
                        className={`px-4 py-3 text-sm ${successMessage
                                ? 'bg-green-100 border border-green-300 text-green-700'
                                : 'bg-red-100 border border-red-300 text-red-700'
                            }`}
                    >
                        {successMessage || error || sendError}
                    </div>
                )}

                <div className="border-t border-gray-200 p-4 bg-white">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            disabled={isSending}
                            maxLength={1000}
                            className="flex-1 text-gray-800 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-pink-500 disabled:bg-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !messageText.trim()}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {isSending ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>

            {showDateModal && (
                <DateStakeModal
                    matchedUserAddress={otherUserAddress}
                    matchedUserName={otherUserName}
                    currentUserAddress={currentUserAddress}
                    currentUserName={currentUserName}
                    onClose={() => setShowDateModal(false)}
                    onSuccess={() => {
                        setShowDateModal(false);
                        setSuccessMessage('✅ Date staked! Waiting for your match to confirm.');
                        setTimeout(() => setSuccessMessage(''), 4000);
                    }}
                />
            )}
        </div>
    );
}
