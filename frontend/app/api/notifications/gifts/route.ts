// app/api/notifications/gift/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create a gift notification based on order_history or physical_gift_orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipientAddress,
      senderAddress,
      senderName,
      giftType, // 'crypto' or 'physical'
      cryptoType, // 'usdc' or 'eth'
      giftAmount,
      giftId, // physical gift ID
      txHash,
      orderId, // from order_history
      physicalOrderId, // from physical_gift_orders
    } = body;

    if (!recipientAddress || !senderAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let title = '';
    let message = '';
    let metadata: any = {
      sender_address: senderAddress,
      sender_name: senderName,
      gift_type: giftType,
      tx_hash: txHash,
    };

    // Get physical gift details if it's a physical gift
    if (giftType === 'physical' && physicalOrderId) {
      const { data: giftOrder } = await supabase
        .from('physical_gift_orders')
        .select('*')
        .eq('id', physicalOrderId)
        .single();

      if (giftOrder) {
        // Map gift_id to emoji and name
        const giftEmojis: Record<string, string> = {
          'roses-bouquet': '🌹',
          'mixed-flowers': '💐',
          'teddy-bear': '🧸',
          'teddy-roses': '🧸🌹',
          'chocolate-box': '🍫',
          'gift-basket': '🎁',
          'spa-box': '🧖‍♀️',
          'dinner-delivery': '🍽️',
          'dessert-box': '🧁',
        };

        const giftNames: Record<string, string> = {
          'roses-bouquet': 'Red Roses Bouquet',
          'mixed-flowers': 'Mixed Flower Arrangement',
          'teddy-bear': 'Plush Teddy Bear',
          'teddy-roses': 'Teddy with Roses',
          'chocolate-box': 'Luxury Chocolate Box',
          'gift-basket': 'Gourmet Gift Basket',
          'spa-box': 'Spa Gift Set',
          'dinner-delivery': 'Restaurant Dinner',
          'dessert-box': 'Dessert Sampler',
        };

        const giftName = giftNames[giftOrder.gift_id] || 'A Gift';
        const giftEmoji = giftEmojis[giftOrder.gift_id] || '📦';

        title = `${giftEmoji} Physical Gift on the Way!`;
        message = `${senderName || 'Someone'} sent you ${giftName}. Delivery in 2-5 days!`;
        
        metadata.gift_id = giftOrder.gift_id;
        metadata.gift_name = giftName;
        metadata.gift_emoji = giftEmoji;
        metadata.physical_order_id = physicalOrderId;
        metadata.amount = giftOrder.amount;
        metadata.delivery_address = `${giftOrder.delivery_city}, ${giftOrder.delivery_state}`;
        metadata.status = giftOrder.status;
        metadata.tracking_number = giftOrder.tracking_number;
      }
    } else if (giftType === 'crypto') {
      // Crypto gift notification
      const emoji = cryptoType === 'usdc' ? '💵' : '💎';
      title = `${emoji} Gift Received!`;
      message = `${senderName || 'Someone'} sent you ${giftAmount} ${cryptoType?.toUpperCase() || 'crypto'}`;
      
      metadata.crypto_type = cryptoType;
      metadata.amount = giftAmount;
      metadata.order_id = orderId;
    }

    // Insert notification into your existing notifications table
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_address: recipientAddress.toLowerCase(),
        type: 'gift',
        title,
        message,
        metadata,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error('Error creating gift notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get gift notifications for a user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userAddress = searchParams.get('userAddress');

  if (!userAddress) {
    return NextResponse.json(
      { error: 'userAddress required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .eq('type', 'gift')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: data });
  } catch (error) {
    console.error('Error fetching gift notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
