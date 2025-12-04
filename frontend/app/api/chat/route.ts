import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const user1 = searchParams.get('user1');
        const user2 = searchParams.get('user2');

        if (!user1 || !user2) {
            return NextResponse.json(
                { error: 'Missing user1 or user2 parameter' },
                { status: 400 }
            );
        }

        // Normalize addresses to lowercase
        const addr1 = user1.toLowerCase();
        const addr2 = user2.toLowerCase();

        // Fetch encrypted messages between these two users
        const { data: messages, error } = await supabaseService
            .from('chat_messages')
            .select('*')
            .or(
                `and(user1_address.eq.${addr1},user2_address.eq.${addr2}),and(user1_address.eq.${addr2},user2_address.eq.${addr1})`
            )
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Supabase error fetching messages:', error);
            return NextResponse.json(
                { error: 'Failed to fetch messages' },
                { status: 500 }
            );
        }

        return NextResponse.json({ messages: messages || [] });
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

        // Validate sender is one of the two users
        if (sender.toLowerCase() !== user1.toLowerCase() && sender.toLowerCase() !== user2.toLowerCase()) {
            return NextResponse.json(
                { error: 'Sender must be one of the matched users' },
                { status: 403 }
            );
        }

        // Validate encrypted message is not empty
        if (typeof encryptedMessage !== 'string' || encryptedMessage.trim().length === 0) {
            return NextResponse.json(
                { error: 'Encrypted message cannot be empty' },
                { status: 400 }
            );
        }

        // Normalize addresses
        const addr1 = user1.toLowerCase();
        const addr2 = user2.toLowerCase();
        const senderAddr = sender.toLowerCase();

        // Insert encrypted message (server cannot read the content)
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

        // Return encrypted data (client will decrypt locally)
        return NextResponse.json({ message: data }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
