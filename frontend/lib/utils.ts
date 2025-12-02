import { randomBytes } from 'crypto';
import { verifyMessage } from 'viem';
import * as brevo from '@getbrevo/brevo';

/**
 * Verify a wallet signature using viem
 */
export async function verifyWalletSignature(
    message: string,
    signature: string,
    address: string
): Promise<boolean> {
    try {
        const isValid = await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`
        });
        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Generate a random UUID token for verification
 */
export function generateToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Send email verification via Brevo
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://basematch.app' : 'http://localhost:3000');
    const verificationUrl = `${baseUrl}/api/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

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
}

/**
 * Calculate photo hash using a simple hash function (compatible with contract)
 * Note: In production, ensure this matches the contract's hashing method
 */
export function calculatePhotoHash(photoUrl: string): string {
    // Using Web Crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(photoUrl);

    // For Node.js environment, use crypto module
    const crypto = require('crypto');
    return '0x' + crypto.createHash('sha256').update(photoUrl).digest('hex');
}
