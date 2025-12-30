import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name, birthYear, gender, interests, email, photoUrl } = body;

    console.log('📥 Registration request');

    if (!address || !name || !birthYear || !gender || !interests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const normalizedEmail = email?.toLowerCase().trim() || null;

    // Validate birth year to ensure age is between 18 and 120
    const currentYear = new Date().getFullYear();
    const calculatedAge = currentYear - birthYear;
    if (calculatedAge < 18 || calculatedAge > 120) {
      return NextResponse.json({ error: 'Age must be between 18 and 120' }, { status: 400 });
    }

    // Check existing profile
    const { data: existingProfile } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      // Update existing
      await supabaseService
        .from('profiles')
        .update({
          wallet_verified: true,
          name,
          birthYear,
          gender,
          interests,
          email: normalizedEmail,
          photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      profileId = existingProfile.id;
      console.log('✅ Profile updated');
    } else {
      // Create new
      const { data: newProfile } = await supabaseService
        .from('profiles')
        .insert([{
          wallet_address: normalizedAddress,
          wallet_verified: true,
          email_verified: false,
          name,
          birthYear,
          gender,
          interests,
          email: normalizedEmail,
          photoUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

      profileId = newProfile!.id;
      console.log('✅ Profile created');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile registered successfully!',
      needsEmailVerification: !!normalizedEmail,
      contractAddress: PROFILE_NFT_ADDRESS,
      userInfo: {
        profileId,
        email: normalizedEmail,
        walletAddress: normalizedAddress,
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
