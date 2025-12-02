import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import * as brevo from '@getbrevo/brevo';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, age, gender, interests, email } = body;

        // Validate input
        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Normalize email to lowercase (must match contract normalization)
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists (use normalized email)
        const { data: existingUser } = await supabaseService
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        // Ensure we have a user record; create if not exists
        let userId = existingUser?.id;
        if (!userId) {
            const { data: user, error: insertError } = await supabaseService
                .from('users')
                .insert([
                    {
                        email: normalizedEmail,
                        name: name || null,
                        age: age ? parseInt(age) : null,
                        gender: gender || null,
                        interests: interests || null,
                        email_verified: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (insertError || !user) {
                console.error('Error creating user:', insertError);
                return NextResponse.json(
                    { error: 'Unable to create account. Please try again or contact support.' },
                    { status: 500 }
                );
            }

            userId = user.id;
        }

        // Create verification token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const { error: tokenError } = await supabaseService
            .from('email_verifications')
            .insert([
                {
                    token,
                    email: normalizedEmail,
                    user_id: userId,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (tokenError) {
            console.error('Error creating verification token:', tokenError);
            return NextResponse.json(
                { error: 'Account created but unable to send verification. Please contact support.' },
                { status: 500 }
            );
        }

        // Create verification URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.NODE_ENV === 'production' ? 'https://basematch.app' : 'http://localhost:3000');
        const verificationUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        // Send verification email using Brevo
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
        
        <p>Hello ${name},</p>
        
        <p>Thank you for signing up with BaseMatch! Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <div class="footer">
            <p>If you didn't sign up for BaseMatch, please ignore this email.</p>
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
                userId: userId
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            // Still return success since user is created and can request a new link
            return NextResponse.json({
                success: true,
                message: 'Account created! Please check your inbox for the verification link.',
                userId: userId,
                note: 'If you don\'t receive the email, please contact support.'
            });
        }
    } catch (error) {
        console.error('Error registering user:', error);
        return NextResponse.json(
            { error: 'Unable to process your registration. Please try again.' },
            { status: 500 }
        );
    }
}
