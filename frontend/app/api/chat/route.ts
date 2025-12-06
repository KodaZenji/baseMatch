import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= maxRequests) {
        return false;
    }

    record.count++;
    return true;
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const user1 = searchParams.get('user1');
        const user2 = searchParams.get('user2');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!user1 || !user2) {
            return NextResponse.json(
                { error: 'Missing user1 or user2 parameter' },
                { status: 400 }
            );
        }

        if (limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: 'Limit must be between 1 and 100' },
                { status: 400 }
            );
        }

        const rateLimitKey = `${user1.toLowerCase()}-${user2.toLowerCase()}`;
        if (!checkRateLimit(rateLimitKey)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const addr1 = user1.toLowerCase();
        const addr2 = user2.toLowerCase();

        const { data: messages, error, count } = await supabaseService
            .from('chat_messages')
            .select('*', { count: 'exact' })
            .or(
                `and(user1_address.eq.${addr1},user2_address.eq.${addr2}),and(user1_address.eq.${addr2},user2_address.eq.${addr1})`
            )
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Supabase error fetching messages:', error);
            return NextResponse.json(
                { error: 'Failed to fetch messages' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            messages: messages || [], 
            total: count,
            hasMore: (offset + limit) < (count || 0)
        });
    } catch (error) {
        console.error('Error in GET /api/chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user1, user2, sender, encryptedMessage, nonce } = body;

        if (!user1 || !user2 || !sender || !encryptedMessage || !nonce) {
            return NextResponse.json(
                { error: 'Missing required fields: user1, user2, sender, encryptedMessage, nonce' },
                { status: 400 }
            );
        }

        if (sender.toLowerCase() !== user1.toLowerCase() && 
            sender.toLowerCase() !== user2.toLowerCase()) {
            return NextResponse.json(
                { error: 'Sender must be one of the matched users' },
                { status: 403 }
            );
        }

        if (typeof encryptedMessage !== 'string' || encryptedMessage.trim().length === 0) {
            return NextResponse.json(
                { error: 'Encrypted message cannot be empty' },
                { status: 400 }
            );
        }

        if (encryptedMessage.length > 10000) {
            return NextResponse.json(
                { error: 'Message too long' },
                { status: 400 }
            );
        }

        const senderKey = `send-${sender.toLowerCase()}`;
        if (!checkRateLimit(senderKey, 30, 60000)) {
            return NextResponse.json(
                { error: 'Too many messages. Please slow down.' },
                { status: 429 }
            );
        }

        const addr1 = user1.toLowerCase();
        const addr2 = user2.toLowerCase();
        const senderAddr = sender.toLowerCase();

        const { data, error } = await supabaseService
            .from('chat_messages')
            .insert({
                user1_address: addr1,
                user2_address: addr2,
                sender_address: senderAddr,
                encrypted_message: encryptedMessage,
                nonce: nonce,
                read_status: false,
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase error inserting message:', error);
            return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: data }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { messageIds, reader } = body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0 || !reader) {
            return NextResponse.json(
                { error: 'Missing required fields: messageIds (array), reader' },
                { status: 400 }
            );
        }

        if (messageIds.length > 100) {
            return NextResponse.json(
                { error: 'Cannot mark more than 100 messages at once' },
                { status: 400 }
            );
        }

        const { error } = await supabaseService
            .from('chat_messages')
            .update({ read_status: true })
            .in('id', messageIds)
            .neq('sender_address', reader.toLowerCase());

        if (error) {
            console.error('Supabase error marking messages as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark messages as read' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH /api/chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const user1 = searchParams.get('user1');
        const user2 = searchParams.get('user2');
        const olderThanDays = parseInt(searchParams.get('days') || '180');

        if (!user1 || !user2) {
            return NextResponse.json(
                { error: 'Missing user1 or user2 parameter' },
                { status: 400 }
            );
        }

        const addr1 = user1.toLowerCase();
        const addr2 = user2.toLowerCase();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const { error, count } = await supabaseService
            .from('chat_messages')
            .delete({ count: 'exact' })
            .or(
                `and(user1_address.eq.${addr1},user2_address.eq.${addr2}),and(user1_address.eq.${addr2},user2_address.eq.${addr1})`
            )
            .lt('created_at', cutoffDate.toISOString());

        if (error) {
            console.error('Supabase error deleting messages:', error);
            return NextResponse.json(
                { error: 'Failed to delete messages' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            deletedCount: count 
        });
    } catch (error) {
        console.error('Error in DELETE /api/chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
