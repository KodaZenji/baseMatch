// app/api/gifts/physical-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
);

// Vendor API integrations (you'll need to set these up)
// For now, this will store orders in your database and you can fulfill manually

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

        // Validate required fields
        if (!giftId || !recipientAddress || !deliveryInfo || !senderAddress || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate delivery info
        if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.state || 
            !deliveryInfo.zip || !deliveryInfo.phone) {
            return NextResponse.json(
                { error: 'Incomplete delivery information' },
                { status: 400 }
            );
        }

        // Create order in database
        const { data: order, error } = await supabase
            .from('physical_gift_orders')
            .insert({
                gift_id: giftId,
                sender_address: senderAddress,
                recipient_address: recipientAddress,
                recipient_name: recipientName,
                delivery_address: deliveryInfo.address,
                delivery_city: deliveryInfo.city,
                delivery_state: deliveryInfo.state,
                delivery_zip: deliveryInfo.zip,
                delivery_phone: deliveryInfo.phone,
                delivery_notes: deliveryInfo.notes || '',
                amount: amount,
                tx_hash: txHash,
                status: 'pending',
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // TODO: Integrate with actual vendor APIs
        // For now, you can manually fulfill orders from your database
        // Later, integrate with:
        // - 1-800-Flowers API
        // - DoorDash Drive API
        // - Uber Direct API
        // - SendFlowers.com API
        // - etc.

        // Send notification to admin (you) about new order
        await fetch(process.env.DISCORD_WEBHOOK_URL || '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🎁 New Physical Gift Order!\n\nGift: ${giftId}\nAmount: $${amount}\nRecipient: ${recipientName}\nAddress: ${deliveryInfo.address}, ${deliveryInfo.city}, ${deliveryInfo.state} ${deliveryInfo.zip}\nPhone: ${deliveryInfo.phone}\nTx: ${txHash}`
            })
        }).catch(console.error);

        // Send confirmation email to recipient (if you have their email)
        // await sendConfirmationEmail(recipientEmail, order);

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
            query = query.eq('sender_address', senderAddress).order('created_at', { ascending: false });
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
