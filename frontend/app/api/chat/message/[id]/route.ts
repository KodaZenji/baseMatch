import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { userAddress } = body;
        const messageId = params.id;

        if (!userAddress) {
            return NextResponse.json(
                { error: 'Missing userAddress' },
                { status: 400 }
            );
        }

        if (!messageId) {
            return NextResponse.json(
                { error: 'Missing message ID' },
                { status: 400 }
            );
        }

        // First, verify the user is the sender of this message
        const { data: message, error: fetchError } = await supabaseService
            .from('chat_messages')
            .select('sender_address')
            .eq('id', messageId)
            .single();

        if (fetchError || !message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        // Check if user is the sender
        if (message.sender_address.toLowerCase() !== userAddress.toLowerCase()) {
            return NextResponse.json(
                { error: 'You can only delete your own messages' },
                { status: 403 }
            );
        }

        // Delete the message
        const { error: deleteError } = await supabaseService
            .from('chat_messages')
            .delete()
            .eq('id', messageId)
            .eq('sender_address', userAddress.toLowerCase());

        if (deleteError) {
            console.error('Supabase error deleting message:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete message' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            success: true,
            messageId 
        });
    } catch (error) {
        console.error('Error in DELETE /api/chat/message/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
