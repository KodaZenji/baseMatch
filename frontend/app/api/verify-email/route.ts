import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        console.log('Verify email attempt:', { token: !!token, email });

        // Validate input
        if (!token || !email) {
            console.error('Missing token or email');
            return new NextResponse(getErrorHTML('Invalid verification link. Please make sure you\'re using the complete link from your email.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        // Look up the verification token in Supabase
        const { data: verificationToken, error: tokenError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .single();

        console.log('Token lookup result:', { found: !!verificationToken, error: tokenError?.message });

        // Check if token exists and matches the email
        if (tokenError || !verificationToken || verificationToken.email !== email) {
            console.error('Token not found or email mismatch');
            return new NextResponse(getErrorHTML('The verification link is invalid or has expired.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        // Check if token is expired
        if (new Date(verificationToken.expires_at) < new Date()) {
            console.error('Token expired');
            // Delete expired token
            await supabaseService
                .from('email_verifications')
                .delete()
                .eq('token', token);

            return new NextResponse(getErrorHTML('The verification link has expired. Please request a new verification email.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        // Mark the email as verified in the profiles table (NOT users)
        const { error: updateError } = await supabaseService
            .from('profiles')  // Changed from 'users' to 'profiles'
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('wallet_address', verificationToken.wallet_address);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            throw updateError;
        }

        console.log('Email verified successfully for:', verificationToken.wallet_address);

        // Delete the used token
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        // Return success HTML
        return new NextResponse(getSuccessHTML(email), {
            headers: { 'Content-Type': 'text/html' }
        });

    } catch (error) {
        console.error('Error verifying email:', error);
        return new NextResponse(getErrorHTML('There was an error verifying your email address. Please try again or contact support.'), {
            headers: { 'Content-Type': 'text/html' },
            status: 500
        });
    }
}

// POST endpoint for email verification from email signup flow
export async function POST(request: Request) {
    try {
        const { token, email } = await request.json();

        if (!token || !email) {
            return NextResponse.json(
                { error: 'Token and email are required' },
                { status: 400 }
            );
        }

        // Find and validate the verification token
        const { data: verification, error: verifyError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .eq('email', email)
            .single();

        if (verifyError || !verification) {
            return NextResponse.json(
                { error: 'Invalid or expired verification link' },
                { status: 400 }
            );
        }

        // Check if token is expired
        if (new Date(verification.expires_at) < new Date()) {
            // Delete expired token
            await supabaseService
                .from('email_verifications')
                .delete()
                .eq('token', token);

            return NextResponse.json(
                { error: 'Verification link has expired' },
                { status: 400 }
            );
        }

        // Update user's email verification status
        const { error: updateError } = await supabaseService
            .from('users')
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', verification.user_id);

        if (updateError) throw updateError;

        console.log('Email verified successfully for:', email);

        // Delete the used token
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        return NextResponse.json({
            success: true,
            userId: verification.user_id,
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

// Helper functions for HTML responses
function getSuccessHTML(email: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Email Verified</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: #f0f2f5;
        }
        .container { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
        }
        .success { color: #4CAF50; }
        a { 
            color: #4f46e5; 
            text-decoration: none;
            font-weight: bold;
        }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="success">✓ Email Verified Successfully!</h1>
        <p>Your email address <strong>${email}</strong> has been verified.</p>
        <p>You can now close this window and return to the app.</p>
        <p><a href="/">Return to BaseMatch</a></p>
    </div>
</body>
</html>
    `;
}

function getErrorHTML(message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Verification Failed</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: #f0f2f5;
        }
        .container { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
        }
        .error { color: #f44336; }
        a { 
            color: #4f46e5; 
            text-decoration: none;
            font-weight: bold;
        }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="error">✗ Verification Failed</h1>
        <p>${message}</p>
        <p><a href="/">Return to BaseMatch</a></p>
    </div>
</body>
</html>
    `;
}