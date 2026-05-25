import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x_username, qt_link, comment_link, wallet_address, tasks_completed } = body;

    // Basic validation
    if (!x_username || !wallet_address) {
      return NextResponse.json(
        { error: 'X username and wallet address are required.' },
        { status: 400 }
      );
    }

    if (!wallet_address.startsWith('0x') || wallet_address.length < 40) {
      return NextResponse.json(
        { error: 'Invalid EVM wallet address.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check for duplicate wallet submission
    const { data: existing } = await supabase
      .from('whitelist_applications')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This wallet has already been submitted.' },
        { status: 409 }
      );
    }

    // Save application
    const { error } = await supabase
      .from('whitelist_applications')
      .insert({
        x_username: x_username.toLowerCase().replace('@', ''),
        qt_link: qt_link || null,
        comment_link: comment_link || null,
        wallet_address: wallet_address.toLowerCase(),
        followed: tasks_completed?.followed === 'done',
        liked: tasks_completed?.liked === 'done',
        qt_done: tasks_completed?.qt === 'done',
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save application. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error('Whitelist apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
