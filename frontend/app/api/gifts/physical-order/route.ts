// app/api/gifts/physical-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            giftId,
            recipientAddress,
            recipientName,
            deliveryInfo,
            senderAddress,
            amount,
            txHash
        } = body;

        if (!giftId || !recipientAddress || !deliveryInfo || !senderAddress || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.state || 
            !deliveryInfo.zip || !deliveryInfo.phone) {
            return NextResponse.json(
                { error: 'Incomplete delivery information' },
                { status: 400 }
            );
        }

        // Create order in physical_gift_orders table
        const { data: order, error: orderError } = await supabase
            .from('physical_gift_orders')
            .insert({
                gift_id: giftId,
                sender_address: senderAddress.toLowerCase(),
                recipient_address: recipientAddress.toLowerCase(),
                recipient_name: recipientName,
                delivery_address: deliveryInfo.address,
                delivery_city: deliveryInfo.city,
                delivery_state: deliveryInfo.state,
                delivery_zip: deliveryInfo.zip,
                delivery_phone: deliveryInfo.phone,
                delivery_notes: deliveryInfo.notes || null,
                amount: amount,
                tx_hash: txHash,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (orderError) {
            console.error('Database error creating order:', orderError);
            return NextResponse.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // Also create entry in order_history table
        const { error: historyError } = await supabase
            .from('order_history')
            .insert({
                gift_id: giftId,
                sender_address: senderAddress.toLowerCase(),
                recipient_name: recipientName,
                amount: amount,
                status: 'pending',
                created_at: new Date().toISOString(),
                delivered_at: null,
                sender_name: null, 
            });

        if (historyError) {
            console.error('Warning: Failed to create order history:', historyError);
            // Don't fail the request, just log it
        }

        // Create gift notification
        try {
            await fetch(`${request.nextUrl.origin}/api/notifications/gift`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientAddress,
                    senderAddress,
                    senderName: 'Your Match', 
                    giftType: 'physical',
                    giftId,
                    txHash,
                    physicalOrderId: order.id,
                })
            });
        } catch (notifError) {
            console.error('Warning: Failed to create notification:', notifError);
            // Don't fail the order if notification fails
        }

        // Send notification to admin
        if (process.env.DISCORD_WEBHOOK_URL) {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🎁 New Physical Gift Order!\n\nGift: ${giftId}\nAmount: $${amount}\nRecipient: ${recipientName}\nAddress: ${deliveryInfo.address}, ${deliveryInfo.city}, ${deliveryInfo.state} ${deliveryInfo.zip}\nPhone: ${deliveryInfo.phone}\nTx: ${txHash}\nOrder ID: ${order.id}`
                })
            }).catch(console.error);
        }

        return NextResponse.json({
            success: true,
            orderId: order.id,
            message: 'Order placed successfully! Delivery in 2-5 business days.'
        });

    } catch (error) {
        console.error('Error processing physical gift order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get order status
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const senderAddress = searchParams.get('senderAddress');

    if (!orderId && !senderAddress) {
        return NextResponse.json(
            { error: 'orderId or senderAddress required' },
            { status: 400 }
        );
    }

    try {
        let query = supabase.from('physical_gift_orders').select('*');

        if (orderId) {
            query = query.eq('id', orderId);
        } else if (senderAddress) {
            query = query.eq('sender_address', senderAddress.toLowerCase())
                         .order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch orders' },
                { status: 500 }
            );
        }

        return NextResponse.json({ orders: data });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
