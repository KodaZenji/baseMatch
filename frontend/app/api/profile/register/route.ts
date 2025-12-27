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
    console.log('🔵 === REGISTRATION REQUEST START ===');
    
    const body = await request.json();
    console.log('📥 Body received:', {
      hasAddress: !!body.address,
      hasSignature: !!body.signature,
      hasMessage: !!body.message,
      signatureLength: body.signature?.length,
      signaturePreview: body.signature?.substring(0, 30),
    });

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

    // Basic validation
    if (!address || !name || !age || !gender || !interests) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: address, name, age, gender, interests' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    console.log('📋 Normalized data:', {
      address: normalizedAddress,
      email: normalizedEmail,
      hasSignature: !!signature,
      hasMessage: !!message,
    });

    // Verify wallet signature (if signature + message provided)
    if (signature && message) {
      console.log('🔐 Starting signature verification...');
      
      try {
        // Parse message if needed
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        console.log('📝 Parsed message:', parsedMessage);

        // Construct params object
        const params = {
          address: normalizedAddress,
          nonce: parsedMessage.nonce,
          issuedAt: parsedMessage.issuedAt,
        };
        
        console.log('🔑 Verification params:', params);
        console.log('✍️ Signature to verify:', {
          length: signature.length,
          startsWithOx: signature.startsWith('0x'),
          preview: signature.substring(0, 30) + '...',
        });

        const isValidSignature = await verifyWalletSignature(signature, params);
        console.log('✅ Signature valid:', isValidSignature);
        
        if (!isValidSignature) {
          console.log('❌ Signature verification failed');
          return NextResponse.json(
            { error: 'Invalid wallet signature' },
            { status: 400 }
          );
        }
      } catch (verifyError) {
        console.error('❌ Signature verification error:', verifyError);
        return NextResponse.json(
          { error: `Signature verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Age check
    if (age < 18 || age > 120) {
      console.log('❌ Invalid age:', age);
      return NextResponse.json(
        { error: 'Age must be between 18 and 120' },
        { status: 400 }
      );
    }

    // Photo URL length check
    if (photoUrl && photoUrl.length > 500) {
      console.log('❌ Photo URL too long');
      return NextResponse.json(
        { error: 'Photo URL too long. Maximum 500 characters.' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up existing profile...');

    // Fetch existing profile
    let existingProfile = null;

    try {
      const { data: existingProfileByWallet, error: walletError } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();

      if (walletError) {
        console.error('❌ Error fetching by wallet:', walletError);
      } else {
        console.log('📁 Profile by wallet:', existingProfileByWallet ? 'found' : 'not found');
      }

      if (normalizedEmail) {
        const { data: existingProfileByEmail, error: emailError } = await supabaseService
          .from('profiles')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (emailError) {
          console.error('❌ Error fetching by email:', emailError);
        } else {
          console.log('📁 Profile by email:', existingProfileByEmail ? 'found' : 'not found');
        }

        // Email conflict check
        if (
          existingProfileByEmail &&
          existingProfileByWallet &&
          existingProfileByEmail.id !== existingProfileByWallet.id
        ) {
          console.log('❌ Email conflict detected');
          return NextResponse.json(
            { error: 'Email is already associated with a different wallet address' },
            { status: 409 }
          );
        }

        existingProfile = existingProfileByEmail || existingProfileByWallet;
      } else {
        existingProfile = existingProfileByWallet;
      }
    } catch (lookupError) {
      console.error('❌ Profile lookup error:', lookupError);
      return NextResponse.json(
        { error: 'Database error during profile lookup' },
        { status: 500 }
      );
    }

    let profileId: string;
    let needsEmailVerification = false;

    // Upsert logic
    if (existingProfile) {
      console.log('📝 Updating existing profile:', existingProfile.id);

      try {
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
            { error: `Failed to update profile: ${updateError.message}` },
            { status: 500 }
          );
        }

        profileId = existingProfile.id;
        needsEmailVerification = normalizedEmail && !existingProfile.email_verified;
        console.log('✅ Profile updated successfully');
      } catch (updateError) {
        console.error('❌ Profile update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    } else {
      console.log('✨ Creating new profile');

      try {
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
            { error: `Failed to create profile: ${createError?.message || 'Unknown error'}` },
            { status: 500 }
          );
        }

        profileId = newProfile.id;
        needsEmailVerification = !!normalizedEmail;
        console.log('✅ Profile created successfully:', profileId);
      } catch (createError) {
        console.error('❌ Profile creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
    }

    // Optional: send email verification
    if (needsEmailVerification && normalizedEmail) {
      console.log('📧 Sending verification email...');
      try {
        const emailResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/register-email`,
          {
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
          }
        );
        
        if (!emailResponse.ok) {
          console.log('⚠️ Email verification failed but continuing...');
        } else {
          console.log('✅ Verification email sent');
        }
      } catch (emailError) {
        console.error('⚠️ Error sending verification email:', emailError);
        // Don't fail registration if email fails
      }
    }

    console.log('✅ Registration successful:', { profileId, needsEmailVerification });
    console.log('🔵 === REGISTRATION REQUEST END ===');

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
    console.error('❌ FATAL ERROR in registration:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Registration failed',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
