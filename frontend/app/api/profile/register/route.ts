// FILE: /api/profile/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS;

/**
 * POST /api/profile/register
 * Supports Wallet + Email registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      address,
      name,
      age,
      gender,
      interests,
      email,
      photoUrl,
      signature,
      message,
    } = body;

    console.log('📥 Registration request:', {
      hasAddress: !!address,
      hasName: !!name,
      hasAge: !!age,
      hasGender: !!gender,
      hasInterests: !!interests,
      hasEmail: !!email,
      hasSignature: !!signature,
    });

    // Basic validation
    if (!address || !name || !age || !gender || !interests) {
      return NextResponse.json(
        { error: 'Missing required fields: address, name, age, gender, interests' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Verify wallet signature (if signature + message provided)
    if (signature && message) {
      console.log('🔐 Verifying wallet signature...');

      // If message is sent as JSON string, parse it
      const parsedMessage =
        typeof message === 'string' ? JSON.parse(message) : message;

      // Construct params object for verifyWalletSignature
      const params = {
        address: normalizedAddress,
        nonce: parsedMessage.nonce,
        issuedAt: parsedMessage.issuedAt,
      };

      const isValidSignature = await verifyWalletSignature(params, signature);

      if (!isValidSignature) {
        return NextResponse.json(
          { error: 'Invalid wallet signature' },
          { status: 400 }
        );
      }

      console.log('✅ Signature verified');
    }

    // Age check
    if (age < 18 || age > 120) {
      return NextResponse.json(
        { error: 'Age must be between 18 and 120' },
        { status: 400 }
      );
    }

    // Photo URL length check
    if (photoUrl && photoUrl.length > 500) {
      return NextResponse.json(
        { error: 'Photo URL too long. Maximum 500 characters.' },
        { status: 400 }
      );
    }

    // Fetch existing profile
    let existingProfile = null;

    const { data: existingProfileByWallet } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (normalizedEmail) {
      const { data: existingProfileByEmail } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      // Email conflict check
      if (
        existingProfileByEmail &&
        existingProfileByWallet &&
        existingProfileByEmail.id !== existingProfileByWallet.id
      ) {
        return NextResponse.json(
          { error: 'Email is already associated with a different wallet address' },
          { status: 409 }
        );
      }

      existingProfile = existingProfileByEmail || existingProfileByWallet;
    } else {
      existingProfile = existingProfileByWallet;
    }

    let profileId: string;
    let needsEmailVerification = false;

    // Upsert logic
    if (existingProfile) {
      console.log('📝 Updating existing profile:', existingProfile.id);

      const updateData: any = {
        wallet_address: normalizedAddress,
        wallet_verified: true,
        name,
        age,
        gender,
        interests,
        updated_at: new Date().toISOString(),
      };

      if (normalizedEmail) updateData.email = normalizedEmail;
      if (photoUrl) updateData.photoUrl = photoUrl;

      const { error: updateError } = await supabaseService
        .from('profiles')
        .update(updateData)
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return NextResponse.json(
          { error: `Registration failed: ${updateError.message}` },
          { status: 500 }
        );
      }

      profileId = existingProfile.id;
      needsEmailVerification = normalizedEmail && !existingProfile.email_verified;
    } else {
      console.log('✨ Creating new profile');

      const insertData: any = {
        wallet_address: normalizedAddress,
        wallet_verified: true,
        email_verified: false,
        name,
        age,
        gender,
        interests,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (normalizedEmail) insertData.email = normalizedEmail;
      if (photoUrl) insertData.photoUrl = photoUrl;

      const { data: newProfile, error: createError } = await supabaseService
        .from('profiles')
        .insert([insertData])
        .select('id')
        .single();

      if (createError || !newProfile) {
        console.error('❌ Error creating profile:', createError);
        return NextResponse.json(
          { error: `Registration failed: ${createError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      profileId = newProfile.id;
      needsEmailVerification = !!normalizedEmail;
    }

    // Optional: send email verification
    if (needsEmailVerification && normalizedEmail) {
      console.log('📧 Sending verification email...');
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/register-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            walletAddress: normalizedAddress,
            name,
            age,
            gender,
            interests,
            skipPhotoUpload: true,
          }),
        });
      } catch (emailError) {
        console.error('⚠️ Error sending verification email:', emailError);
      }
    }

    console.log('✅ Registration successful:', { profileId, needsEmailVerification });

    return NextResponse.json({
      success: true,
      message: needsEmailVerification
        ? 'Profile registered. Please verify your email to complete registration.'
        : 'Profile registered successfully!',
      needsEmailVerification,
      contractAddress: PROFILE_NFT_ADDRESS,
      createProfilePayload: {
        name,
        age,
        gender,
        interests,
        photoUrl: photoUrl || '',
        email: normalizedEmail || '',
      },
      userInfo: {
        profileId,
        email: normalizedEmail,
        walletAddress: normalizedAddress,
        emailVerified: !needsEmailVerification,
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
