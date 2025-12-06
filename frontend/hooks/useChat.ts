import { useState, useEffect, useCallback } from 'react';
import { encryptMessage, decryptMessage } from '@/lib/crypto';

export interface ChatMessage {
    id: string;
    user1_address: string;
    user2_address: string;
    sender_address: string;
    encrypted_message: string;
    nonce: string;
    created_at: string;
    read_status: boolean;
    decrypted_text?: string; // Client-side decrypted message
}

interface UseChatProps {
    user1Address: string;
    user2Address: string;
    userAddress?: string; // Current user's address for sending messages
}

export function useChat({ user1Address, user2Address, userAddress }: UseChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Decrypt all messages client-side
    const decryptMessages = useCallback(async (encryptedMessages: ChatMessage[]) => {
        const decrypted = await Promise.all(
            encryptedMessages.map(async (msg) => {
                try {
                    const decryptedText = await decryptMessage(
                        msg.encrypted_message,
                        msg.nonce,
                        user1Address,
                        user2Address
                    );
                    return { ...msg, decrypted_text: decryptedText };
                } catch (err) {
                    console.error('Failed to decrypt message:', err);
                    return { ...msg, decrypted_text: '[Failed to decrypt message]' };
                }
            })
        );
        return decrypted;
    }, [user1Address, user2Address]);

    // Fetch messages
    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/chat?user1=${encodeURIComponent(user1Address)}&user2=${encodeURIComponent(user2Address)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            const encryptedMessages = data.messages || [];

            // Decrypt all messages client-side
            const decryptedMessages = await decryptMessages(encryptedMessages);
            setMessages(decryptedMessages);

            // Mark unread messages from the other user as read
            if (userAddress && encryptedMessages.length > 0) {
                const unreadMessageIds = encryptedMessages
                    .filter(
                        (msg: ChatMessage) =>
                            !msg.read_status &&
                            msg.sender_address.toLowerCase() !== userAddress.toLowerCase()
                    )
                    .map((msg: ChatMessage) => msg.id);

                if (unreadMessageIds.length > 0) {
                    try {
                        const markReadResponse = await fetch('/api/chat', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                messageIds: unreadMessageIds,
                                reader: userAddress,
                            }),
                        });

                        if (!markReadResponse.ok) {
                            console.warn('Failed to mark messages as read');
                        }
                    } catch (markReadError) {
                        console.error('Error marking messages as read:', markReadError);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    }, [user1Address, user2Address, userAddress, decryptMessages]);

    // Initial fetch and polling
    useEffect(() => {
        fetchMessages();

        // Poll for new messages every 2 seconds
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Send message
    const sendMessage = useCallback(
        async (messageText: string) => {
            if (!userAddress) {
                setError('User address not available');
                return false;
            }

            if (!messageText.trim()) {
                setError('Message cannot be empty');
                return false;
            }

            try {
                setIsSending(true);
                setError(null);

                // Encrypt message on client-side
                const { encrypted, nonce } = await encryptMessage(
                    messageText,
                    user1Address,
                    user2Address
                );

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user1: user1Address,
                        user2: user2Address,
                        sender: userAddress,
                        encryptedMessage: encrypted,
                        nonce: nonce,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to send message');
                }

                // Refresh messages after sending
                await fetchMessages();
                return true;
            } catch (err) {
                console.error('Error sending message:', err);
                setError(err instanceof Error ? err.message : 'Failed to send message');
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [user1Address, user2Address, userAddress, fetchMessages]
    );

    return {
        messages,
        loading,
        error,
        isSending,
        sendMessage,
        refreshMessages: fetchMessages,
    };
}
