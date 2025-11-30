import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import * as brevo from '@getbrevo/brevo';

// Force Node.js runtime (required for Brevo and crypto)
export const runtime = 'nodejs';



export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, address } = body;

        // Validate input
        if (!email || !address) {
            return NextResponse.json(
                { error: 'Email and wallet address are required' },
                { status: 400 }
            );
        }

        // Validate environment variables
        if (!process.env.BREVO_API_KEY) {
            console.error('Missing BREVO_API_KEY environment variable');
            return NextResponse.json(
                { error: 'Email service not properly configured' },
                { status: 500 }
            );
        }

        // Create a verification token in Supabase
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const { error: insertError } = await supabaseService
            .from('email_verifications')
            .insert([
                {
                    token,
                    email,
                    wallet_address: address,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (insertError) {
            console.error('Error creating verification token:', insertError);
            return NextResponse.json(
                { error: 'Failed to create verification token' },
                { status: 500 }
            );
        }

        // Create verification URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.NODE_ENV === 'production' ? 'https://basematch.app' : 'http://localhost:3000');
        const verificationUrl = `${baseUrl}/api/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

        // Send verification email using Brevo
        try {
            const apiInstance = new brevo.TransactionalEmailsApi();
            apiInstance.setApiKey(
                brevo.TransactionalEmailsApiApiKeys.apiKey,
                process.env.BREVO_API_KEY
            );

            const sendSmtpEmail = new brevo.SendSmtpEmail();
            sendSmtpEmail.sender = {
                name: process.env.BREVO_SENDER_NAME || 'BaseMatch',
                email: process.env.BREVO_SENDER_EMAIL || 'noreply@basematch.app'
            };
            sendSmtpEmail.to = [{ email }];
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
        
        <p>Hello,</p>
        
        <p>Thank you for registering with BaseMatch! Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <div class="footer">
            <p>If you didn't register for BaseMatch, please ignore this email.</p>
            <p>&copy; 2025 BaseMatch. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
                `;

            await apiInstance.sendTransacEmail(sendSmtpEmail);

            return NextResponse.json({
                success: true,
                message: 'Verification link sent to your email!'
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again later.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error creating verification token:', error);
        return NextResponse.json(
            { error: 'Failed to process verification request' },
            { status: 500 }
        );
    }
}