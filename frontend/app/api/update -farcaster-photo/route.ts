// app/api/update-farcaster-photo/route.ts 

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function POST(request: Request) {
  try {
    const { address, usePhoto, photoUrl } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (usePhoto && photoUrl) {
      updateData.photoUrl = photoUrl;
    }

    const { error } = await supabaseService
      .from('profiles')
      .update(updateData)
      .eq('wallet_address', normalizedAddress);

    if (error) {
      console.error('Error updating photo:', error);
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: usePhoto 
        ? 'Profile photo updated from Farcaster!' 
        : 'Verification complete!',
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
