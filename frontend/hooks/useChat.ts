import { useState, useEffect, useCallback, useRef } from 'react';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { supabaseClient } from '@/lib/supabase/client';

export interface ChatMessage {
    id: string;
    user1_address: string;
    user2_address: string;
    sender_address: string;
    encrypted_message: string;
    nonce: string;
    created_at: string;
    read_status: boolean;
    decrypted_text?: string;
}

interface UseChatProps {
    user1Address: string;
    user2Address: string;
    userAddress?: string;
    messagesPerPage?: number;
}

export function useChat({ 
    user1Address, 
    user2Address, 
    userAddress,
    messagesPerPage = 50 
}: UseChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    
    const realtimeChannelRef = useRef<any>(null);
    const decryptionCacheRef = useRef<Map<string, string>>(new Map());

    const decryptMessages = useCallback(async (encryptedMessages: ChatMessage[]) => {
        const decrypted = await Promise.all(
            encryptedMessages.map(async (msg) => {
                const cached = decryptionCacheRef.current.get(msg.id);
                if (cached) {
                    return { ...msg, decrypted_text: cached };
                }

                try {
                    const decryptedText = await decryptMessage(
                        msg.encrypted_message,
                        msg.nonce,
                        user1Address,
                        user2Address
                    );
                    decryptionCacheRef.current.set(msg.id, decryptedText);
                    return { ...msg, decrypted_text: decryptedText };
                } catch (err) {
                    console.error('Failed to decrypt message:', err);
                    return { ...msg, decrypted_text: '[Failed to decrypt]' };
                }
            })
        );
        return decrypted;
    }, [user1Address, user2Address]);

    const fetchMessages = useCallback(async (pageNum: number = 0, append: boolean = false) => {
        try {
            setLoading(true);
            setError(null);

            const offset = pageNum * messagesPerPage;
            const response = await fetch(
                `/api/chat?user1=${encodeURIComponent(user1Address)}&user2=${encodeURIComponent(user2Address)}&limit=${messagesPerPage}&offset=${offset}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            const encryptedMessages = data.messages || [];
            
            setHasMore(encryptedMessages.length === messagesPerPage);

            const decryptedMessages = await decryptMessages(encryptedMessages);

            if (append) {
                setMessages(prev => [...prev, ...decryptedMessages]);
            } else {
                setMessages(decryptedMessages);
            }

            if (userAddress && encryptedMessages.length > 0) {
                const unreadMessageIds = encryptedMessages
                    .filter((msg: ChatMessage) => 
                        !msg.read_status && 
                        msg.sender_address.toLowerCase() !== userAddress.toLowerCase()
                    )
                    .map((msg: ChatMessage) => msg.id);

                if (unreadMessageIds.length > 0) {
                    fetch('/api/chat', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messageIds: unreadMessageIds,
                            reader: userAddress,
                        }),
                    }).catch(err => console.error('Error marking messages as read:', err));
                }
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    }, [user1Address, user2Address, userAddress, messagesPerPage, decryptMessages]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchMessages(nextPage, true);
        }
    }, [loading, hasMore, page, fetchMessages]);

    useEffect(() => {
        fetchMessages(0, false);

        const addr1 = user1Address.toLowerCase();
        const addr2 = user2Address.toLowerCase();

        const channel = supabaseClient
            .channel(`chat:${addr1}:${addr2}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `or(and(user1_address=eq.${addr1},user2_address=eq.${addr2}),and(user1_address=eq.${addr2},user2_address=eq.${addr1}))`,
                },
                async (payload) => {
                    const newMessage = payload.new as ChatMessage;
                    
                    const decrypted = await decryptMessages([newMessage]);
                    setMessages(prev => [decrypted[0], ...prev]);

                    if (userAddress && 
                        newMessage.sender_address.toLowerCase() !== userAddress.toLowerCase()) {
                        fetch('/api/chat', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                messageIds: [newMessage.id],
                                reader: userAddress,
                            }),
                        }).catch(err => console.error('Error marking message as read:', err));
                    }
                }
            )
            .subscribe();

        realtimeChannelRef.current = channel;

        return () => {
            if (realtimeChannelRef.current) {
                supabaseClient.removeChannel(realtimeChannelRef.current);
            }
        };
    }, [user1Address, user2Address, userAddress, fetchMessages, decryptMessages]);

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

                return true;
            } catch (err) {
                console.error('Error sending message:', err);
                setError(err instanceof Error ? err.message : 'Failed to send message');
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [user1Address, user2Address, userAddress]
    );

    const deleteMessage = useCallback(
        async (messageId: string) => {
            try {
                const response = await fetch(`/api/chat/message/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userAddress }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete message');
                }

                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                return true;
            } catch (err) {
                console.error('Error deleting message:', err);
                setError(err instanceof Error ? err.message : 'Failed to delete message');
                return false;
            }
        },
        [userAddress]
    );

    return {
        messages,
        loading,
        error,
        isSending,
        hasMore,
        sendMessage,
        deleteMessage,
        loadMore,
        refreshMessages: () => {
            setPage(0);
            fetchMessages(0, false);
        },
    };
}
