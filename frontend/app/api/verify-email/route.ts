import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { code, email } = await request.json();

        console.log('Verify email attempt:', { code: !!code, email });

        if (!code || !email) {
            return NextResponse.json(
                { error: 'Code and email are required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Look up the verification code
        const { data: verificationRecord, error: codeError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('code', code)
            .eq('email', normalizedEmail)
            .single();

        if (codeError || !verificationRecord) {
            console.error('Code not found:', codeError);
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Check expiry
        if (new Date(verificationRecord.expires_at) < new Date()) {
            await supabaseService
                .from('email_verifications')
                .delete()
                .eq('code', code);
            return NextResponse.json(
                { error: 'Verification code has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        const targetProfileId = verificationRecord.profile_id;
        const verificationEmail = verificationRecord.email;

        // Get the profile
        const { data: profile, error: profileError } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('id', targetProfileId)
            .single();

        if (profileError || !profile) {
            console.error('Profile not found:', profileError);
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 400 }
            );
        }

        console.log('📋 FULL PROFILE DATA:', JSON.stringify(profile, null, 2));
        
        const hasName = profile.name && typeof profile.name === 'string' && profile.name.trim().length > 0;
        const isExistingUser = hasName;
        const wasAlreadyVerified = profile.email_verified;

        console.log('🔍 User verification status:', { 
            profileId: targetProfileId,
            hasName,
            isExistingUser,
            wasAlreadyVerified,
            currentEmail: profile.email,
            newEmail: verificationEmail
        });

        // Update profile: mark email as verified AND update the email address
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                email: verificationEmail,
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetProfileId);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            throw updateError;
        }

        console.log('Email verified and updated successfully for profile:', targetProfileId);

        // Create email verification notification (only if not already verified)
        if (!wasAlreadyVerified) {
            try {
                const userAddress = profile.wallet_address || verificationEmail;
                
                await supabaseService
                    .from('notifications')
                    .insert({
                        user_address: userAddress.toLowerCase(),
                        type: 'profile_complete',
                        title: '✅ Email Verified!',
                        message: isExistingUser 
                            ? 'Your email has been successfully verified!'
                            : 'Your email has been verified! Complete your profile to start matching.',
                        metadata: {
                            profile_id: targetProfileId,
                            email: verificationEmail,
                            is_new_user: !isExistingUser
                        }
                    });
                
                console.log('✅ Email verification notification created for:', userAddress);
            } catch (notifError) {
                console.error('Failed to create email verification notification:', notifError);
            }
        } else {
            console.log('⏭️ Skipping notification - email was already verified');
        }

        // Cleanup: Delete the used code
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('code', code);

        return NextResponse.json({
            success: true,
            profile_id: targetProfileId,
            is_existing_user: isExistingUser,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json(
            { error: 'Failed to verify email' },
            { status: 500 }
        );
    }
}
