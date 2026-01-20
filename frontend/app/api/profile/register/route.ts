import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      address, 
      name, 
      birthYear, 
      gender, 
      interests, 
      email, 
      photoUrl, 
      farcasterVerified,
      farcasterUsername,
      farcasterFid,
      profileSource 
    } = body;

    console.log('📥 Registration request:', { 
      profileSource, 
      photoUrl,
      farcasterVerified,
      farcasterUsername,
      farcasterFid 
    });

    if (!address || !name || !birthYear || !gender || !interests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const normalizedEmail = email?.toLowerCase().trim() || null;

    // Validate birth year
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
      
      const updateData: any = {
        wallet_verified: true,
        farcaster_verified: farcasterVerified || false,
        farcaster_username: farcasterUsername || null,
        farcaster_fid: farcasterFid || null,
        name,
        birthYear,
        gender,
        interests,
        email: normalizedEmail,
        updated_at: new Date().toISOString(),
      };

  
      if (photoUrl && photoUrl !== existingProfile.photoUrl) {
        updateData.photoUrl = photoUrl;
        console.log('📸 Updating photo:', photoUrl);
      } else {
        console.log('📸 Preserving existing photo:', existingProfile.photoUrl);
      }

      
      if (profileSource && !existingProfile.profile_source) {
        updateData.profile_source = profileSource;
        console.log('✅ Setting profile_source:', profileSource);
      }

      await supabaseService
        .from('profiles')
        .update(updateData)
        .eq('id', existingProfile.id);

      profileId = existingProfile.id;
      console.log('✅ Profile updated with Farcaster data:', {
        farcaster_verified: updateData.farcaster_verified,
        farcaster_username: updateData.farcaster_username,
        farcaster_fid: updateData.farcaster_fid
      });
    } else {
      // Create new profile
      const { data: newProfile } = await supabaseService
        .from('profiles')
        .insert([{
          wallet_address: normalizedAddress,
          wallet_verified: true,
          email_verified: false,
          farcaster_verified: farcasterVerified || false,
          farcaster_username: farcasterUsername || null,
          farcaster_fid: farcasterFid || null,
          profile_source: profileSource || 'manual', 
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
      console.log('✅ New profile created with Farcaster data:', {
        source: profileSource,
        farcaster_verified: farcasterVerified,
        farcaster_username: farcasterUsername,
        farcaster_fid: farcasterFid
      });
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
        farcasterVerified: farcasterVerified || false,
        farcasterUsername: farcasterUsername || null,
        profileSource: profileSource || 'manual',
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
