'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import DateStakeModal from './DateStakeModal';
import Image from 'next/image';
import styles from './ChatWindow.module.css';

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
    const [otherUserProfile, setOtherUserProfile] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const otherUserName = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Name : user1Name;
    const otherUserAddress = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Address : user1Address;

    // Fetch other user's profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/profile/${otherUserAddress}`);
                if (res.ok) {
                    const data = await res.json();
                    setOtherUserProfile(data);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfile();
    }, [otherUserAddress]);

    // Scroll to bottom on new message, unless user is reading older messages
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

        if (distanceFromBottom < 100) {
            // User is near bottom, auto scroll
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Handle send
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
        } else {
            setSendError('Failed to send message');
        }
    };

    // Load more messages when scrolling to top
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container || loading || !hasMore) return;

        if (container.scrollTop < 50) {
            const oldScrollHeight = container.scrollHeight;
            loadMore();
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    const newScrollHeight = messagesContainerRef.current.scrollHeight;
                    messagesContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
                }
            }, 100); // slight delay for messages prepending
        }
    };

    // Delete
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

    // Long press for mobile
    const handleTouchStart = (messageId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            setLongPressMessageId(messageId);
            navigator.vibrate?.(50);
        }, 500);
    };
    const handleTouchEnd = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };

    // Handle key down for input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageText.trim() && !isSending) {
                handleSendMessage(e as any);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] md:max-h-[90vh] flex flex-col">
                {/* HEADER */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {otherUserProfile?.photoUrl ? (
                            <Image
                                src={otherUserProfile.photoUrl}
                                alt={otherUserName}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {otherUserName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{otherUserName}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{otherUserAddress}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowDateModal(true)}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm leading-tight"
                        >
                            💕 Date
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-3xl sm:text-2xl leading-none p-1 -mr-1 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* SYSTEM INFO */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-2 text-xs text-blue-700 dark:text-blue-300 flex-shrink-0">
                    🔒 End-to-end encrypted
                </div>

                {/* MESSAGES */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className={`flex-1 overflow-y-auto px-4 py-2 ${styles.chatContainer}`}
                >
                    <div className={styles.messagesList}>
                        {loading && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                No messages yet 💬
                            </div>
                        ) : (
                            <>
                                {hasMore && (
                                    <div className="text-center py-2 mb-2">
                                        <button onClick={loadMore} disabled={loading} className="text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50">
                                            {loading ? 'Loading...' : '↑ Load older messages'}
                                        </button>
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isCurrentUser = msg.sender_address.toLowerCase() === currentUserAddress.toLowerCase();
                                    const isDeleting = deletingMessageId === msg.id;
                                    const showDeleteButton = longPressMessageId === msg.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2 group`}>
                                            <div className="relative flex items-center gap-2">
                                                {isCurrentUser && !isDeleting && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className={`text-red-500 hover:text-red-700 text-lg flex-shrink-0 transition-opacity ${showDeleteButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                                <div
                                                    onTouchStart={() => isCurrentUser && !isDeleting && handleTouchStart(msg.id)}
                                                    onTouchEnd={handleTouchEnd}
                                                    onTouchMove={handleTouchEnd}
                                                    className={`max-w-xs px-4 py-2 rounded-2xl cursor-pointer select-none shadow-sm ${
                                                        isCurrentUser ? styles.chatBubbleCurrent : styles.chatBubbleOther
                                                    } ${isDeleting ? 'opacity-50' : ''} ${showDeleteButton ? 'scale-95' : ''} transition-transform`}
                                                >
                                                    <p className="break-words">{msg.decrypted_text || '[Decrypting...]'}</p>
                                                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-pink-100 dark:text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    <div ref={messagesEndRef} />
                </div>

                {/* ERROR / SUCCESS */}
                {(error || sendError || successMessage) && (
                    <div className={`px-4 py-2 text-sm flex-shrink-0 ${successMessage ? 'bg-green-100 border-t border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-red-100 border-t border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'}`}>
                        {successMessage || error || sendError}
                    </div>
                )}

                {/* INPUT */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0 bg-white dark:bg-gray-900">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            disabled={isSending}
                            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !messageText.trim()}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex-shrink-0"
                        >
                            ➤
                        </button>
                    </form>
                </div>
            </div>

            {showDateModal && (
                <DateStakeModal
                    matchedUserAddress={otherUserAddress}
                    matchedUserName={otherUserName}
                    currentUserAddress={currentUserAddress}
                    currentUserName={currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user1Name : user2Name}
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
