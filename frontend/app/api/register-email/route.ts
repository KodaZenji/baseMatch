import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';
import * as brevo from '@getbrevo/brevo';

export const runtime = 'nodejs';

// Generate 6-digit code
function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, age, gender, interests, email, walletAddress } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedWallet = walletAddress ? walletAddress.toLowerCase().trim() : null;

        let existingProfile = null;
        
        // Look up by wallet address if provided
        if (normalizedWallet) {
            const { data } = await supabaseService
                .from('profiles') 
                .select('id, name, email')
                .eq('wallet_address', normalizedWallet)
                .single();
            existingProfile = data;
        }
        
        // Look up by email
        if (!existingProfile) {
            const { data } = await supabaseService
                .from('profiles') 
                .select('id, name, email')
                .eq('email', normalizedEmail)
                .single();
            existingProfile = data;
        }

        let profileId = existingProfile?.id;
        
        if (!profileId) {
            // New profile - create it
            const { data: profile, error: insertError } = await supabaseService
                .from('profiles')
                .insert([
                    {
                        email: normalizedEmail,
                        wallet_address: normalizedWallet || null,
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
                    { error: 'Unable to create profile. Please try again.' },
                    { status: 500 }
                );
            }

            profileId = profile.id;
        }

        // Generate 6-digit verification code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing codes for this email
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('email', normalizedEmail);

        // Insert new verification code
        const { error: codeError } = await supabaseService
            .from('email_verifications')
            .insert([
                {
                    code,
                    email: normalizedEmail,
                    profile_id: profileId,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (codeError) {
            console.error('Error creating verification code:', codeError);
            return NextResponse.json(
                { error: 'Unable to send verification. Please try again.' },
                { status: 500 }
            );
        }

        // Send email with Brevo
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
            sendSmtpEmail.subject = 'Your BaseMatch Verification Code';
            
            sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 16px; overflow: hidden; }
        .header { text-align: center; padding: 40px 20px 20px; }
        .logo { background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .title { color: white; font-size: 32px; font-weight: bold; margin: 0; }
        .subtitle { color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0; }
        .content { background: white; margin: 20px; border-radius: 12px; padding: 40px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
        .message { font-size: 16px; color: #666; margin-bottom: 30px; line-height: 1.6; }
        .code-box { background: linear-gradient(135deg, #eff6ff 0%, #fae8ff 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .code-label { font-size: 14px; color: #3b82f6; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .code { font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .warning { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .warning-text { font-size: 14px; color: #92400e; margin: 0; }
        .footer-text { font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; line-height: 1.6; }
        .brand-footer { text-align: center; padding: 30px; color: rgba(255,255,255,0.8); font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#3b82f6" />
                            <stop offset="100%" style="stop-color:#9333ea" />
                        </linearGradient>
                    </defs>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="url(#grad)"/>
                </svg>
            </div>
            <div class="title">BaseMatch</div>
            <div class="subtitle">Email Verification</div>
        </div>
        
        <div class="content">
            <div class="greeting">Hello${name ? ' ' + name : ''}! 👋</div>
            <div class="message">
                Welcome to BaseMatch! To complete your registration, please use the verification code below:
            </div>
            
            <div class="code-box">
                <div class="code-label">Your Verification Code</div>
                <div class="code">${code}</div>
            </div>
            
            <div class="message">
                Enter this code in the BaseMatch app to verify your email address.
            </div>
            
            <div class="warning">
                <p class="warning-text">
                    ⏰ <strong>Important:</strong> This code will expire in 10 minutes for security reasons.
                </p>
            </div>
            
            <div class="footer-text">
                If you didn't request this verification code, please ignore this email
            </div>
        </div>
        
        <div class="brand-footer">
            <div>Thanks for choosing BaseMatch!</div>
            <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.6);">
                © 2025 BaseMatch. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
            `;

            await apiInstance.sendTransacEmail(sendSmtpEmail);

            return NextResponse.json({
                success: true,
                message: 'Verification code sent! Please check your inbox.',
                profileId: profileId
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json({
                success: true,
                message: 'Profile created! Please check your inbox for the verification code.',
                profileId: profileId
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
