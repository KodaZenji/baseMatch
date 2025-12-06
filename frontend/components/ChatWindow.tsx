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
    const { messages, loading, error, isSending, sendMessage } = useChat({
        user1Address,
        user2Address,
        userAddress: currentUserAddress,
    });

    const [messageText, setMessageText] = useState('');
    const [sendError, setSendError] = useState<string | null>(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        } else {
            setSendError('Failed to send message. Please try again.');
        }
    };

    const otherUserName = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Name : user1Name;
    const otherUserAddress = currentUserAddress.toLowerCase() === user1Address.toLowerCase() ? user2Address : user1Address;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{otherUserName}</h2>
                        <p className="text-xs text-gray-500 truncate">{otherUserAddress}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowDateModal(true)}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
                        >
                            💕 Go on a Date
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            x
                        </button>
                    </div>
                </div>

                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700">
                    Secure end-to-end encrypted chat - Only you and your match can read messages
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                                <div className="text-sm">Start the conversation</div>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isCurrentUser = msg.sender_address.toLowerCase() === currentUserAddress.toLowerCase();
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs px-4 py-2 rounded-lg ${isCurrentUser
                                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="break-words">{msg.decrypted_text || msg.encrypted_message}</p>
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
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {(error || sendError || successMessage) && (
                    <div className={`px-4 py-3 text-sm ${successMessage
                            ? 'bg-green-100 border border-green-300 text-green-700'
                            : 'bg-red-100 border border-red-300 text-red-700'
                        }`}>
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
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-pink-500 disabled:bg-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !messageText.trim()}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Date Stake Modal */}
            {showDateModal && (
                <DateStakeModal
                    matchedUserAddress={otherUserAddress}
                    matchedUserName={otherUserName}
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
