import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import { randomBytes } from 'crypto';
import * as brevo from '@getbrevo/brevo';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, age, gender, interests, email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if profile already exists
        const { data: existingProfile } = await supabaseService
            .from('profiles') 
            .select('id, name, wallet_address')
            .eq('email', normalizedEmail)
            .single();

        // Determine if this is an existing user (has name) or new registration
        const isExistingUser = existingProfile && existingProfile.name;
        let profileId = existingProfile?.id;
        
        if (!profileId) {
            // New profile - create it
            const { data: profile, error: insertError } = await supabaseService
                .from('profiles')
                .insert([
                    {
                        email: normalizedEmail,
                        name: name || null,
                        age: age ? parseInt(age) : null,
                        gender: gender || null,
                        interests: interests || null,
                        email_verified: false,
                        wallet_verified: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (insertError || !profile) {
                console.error('Error creating profile:', insertError);
                return NextResponse.json(
                    { error: 'Unable to create profile. Please try again or contact support.' },
                    { status: 500 }
                );
            }

            profileId = profile.id;
        }

        // Create verification token with context
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { error: tokenError } = await supabaseService
            .from('email_verifications')
            .insert([
                {
                    token,
                    email: normalizedEmail,
                    profile_id: profileId,
                    is_existing_user: isExistingUser, // NEW: Track if user already has profile
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (tokenError) {
            console.error('Error creating verification token:', tokenError);
            return NextResponse.json(
                { error: 'Profile created but unable to send verification. Please contact support.' },
                { status: 500 }
            );
        }

        // Create verification URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.NODE_ENV === 'production' ? 'https://basematch.app' : 'http://localhost:3000');
        const verificationUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        try {
            const apiInstance = new brevo.TransactionalEmailsApi();
            apiInstance.setApiKey(
                brevo.TransactionalEmailsApiApiKeys.apiKey,
                process.env.BREVO_API_KEY || ''
            );

            const sendSmtpEmail = new brevo.SendSmtpEmail();
            sendSmtpEmail.sender = {
                name: process.env.BREVO_SENDER_NAME || 'BaseMatch',
                email: process.env.BREVO_SENDER_EMAIL || 'noreply@basematch.app'
            };
            sendSmtpEmail.to = [{ email: normalizedEmail, name }];
            sendSmtpEmail.subject = 'Verify your email address - BaseMatch';
            
            sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify your email - BaseMatch</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #4f46e5; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold;
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 12px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💖 BaseMatch</h1>
            <h2>Email Verification</h2>
        </div>
        
        <p>Hello ${name || 'User'},</p>
        
        <p>Thank you for ${isExistingUser ? 'updating your email with' : 'signing up with'} BaseMatch! Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <div class="footer">
            <p>If you didn't ${isExistingUser ? 'update your email' : 'sign up'} for BaseMatch, please ignore this email.</p>
            <p>&copy; 2025 BaseMatch. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            `;

            await apiInstance.sendTransacEmail(sendSmtpEmail);

            return NextResponse.json({
                success: true,
                message: 'Verification email sent! Please check your inbox.',
                profileId: profileId,
                isExistingUser: isExistingUser
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json({
                success: true,
                message: 'Profile created! Please check your inbox for the verification link.',
                profileId: profileId,
                note: 'If you don\'t receive the email, please contact support.'
            });
        }
    } catch (error) {
        console.error('Error registering profile:', error);
        return NextResponse.json(
            { error: 'Unable to process your registration. Please try again.' },
            { status: 500 }
        );
    }
}
