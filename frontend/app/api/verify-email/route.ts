import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        console.log('Verify email attempt:', { token: !!token, email });

        if (!token || !email) {
            return new NextResponse(getErrorHTML('Invalid verification link.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        // Look up the verification token
        const { data: verificationToken, error: tokenError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError || !verificationToken || verificationToken.email !== email) {
            console.error('Token not found or email mismatch');
            return new NextResponse(getErrorHTML('The verification link is invalid or has expired.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        // Check expiry
        if (new Date(verificationToken.expires_at) < new Date()) {
            await supabaseService.from('email_verifications').delete().eq('token', token);
            return new NextResponse(getErrorHTML('The verification link has expired.'), {
                headers: { 'Content-Type': 'text/html' },
                status: 400
            });
        }

        const targetProfileId = verificationToken.profile_id;

        // Check the profile to determine if user is existing (has completed profile)
        const { data: profile } = await supabaseService
            .from('profiles')
            .select('name, wallet_address')
            .eq('id', targetProfileId)
            .single();
        
        // User is "existing" if they have a name (completed their profile)
        const isExistingUser = !!(profile?.name);

        // Mark email as verified in PROFILES table
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetProfileId);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            throw updateError;
        }

        console.log('Email verified successfully for profile:', targetProfileId);

        // Cleanup: Delete the used token
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        // Return success HTML with appropriate redirect
        return new NextResponse(getSuccessHTML(email, isExistingUser), {
            headers: { 'Content-Type': 'text/html' }
        });

    } catch (error) {
        console.error('Error verifying email:', error);
        return new NextResponse(getErrorHTML('System error verifying email. Please try again.'), {
            headers: { 'Content-Type': 'text/html' },
            status: 500
        });
    }
}

// POST endpoint for client-side verification calls
export async function POST(request: Request) {
    try {
        const { token, email } = await request.json();

        if (!token || !email) {
            return NextResponse.json({ error: 'Token and email required' }, { status: 400 });
        }

        // Look up token
        const { data: verification, error: verifyError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .eq('email', email)
            .single();

        if (verifyError || !verification) {
            return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
        }

        if (new Date(verification.expires_at) < new Date()) {
            await supabaseService.from('email_verifications').delete().eq('token', token);
            return NextResponse.json({ error: 'Link expired' }, { status: 400 });
        }

        const targetProfileId = verification.profile_id;

        // Check the profile to determine if user is existing
        const { data: profile } = await supabaseService
            .from('profiles')
            .select('name, wallet_address')
            .eq('id', targetProfileId)
            .single();
        
        const isExistingUser = !!(profile?.name);

        // Update PROFILES table
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetProfileId);

        if (updateError) throw updateError;

        // Cleanup
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        return NextResponse.json({
            success: true,
            profile_id: targetProfileId,
            is_existing_user: isExistingUser,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }
}

// Helper function for success HTML with redirect logic
function getSuccessHTML(email: string, isExistingUser: boolean): string {
    const redirectUrl = isExistingUser ? '/profile/edit' : '/complete-profile';
    const redirectMessage = isExistingUser 
        ? 'Redirecting back to your profile...' 
        : 'Redirecting to complete your profile...';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Email Verified</title>
    <meta http-equiv="refresh" content="3;url=${redirectUrl}">
    <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
        .success { color: #4CAF50; }
        a { color: #4f46e5; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .redirect-note { color: #666; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="success">✓ Email Verified Successfully!</h1>
        <p>Your email address <strong>${email}</strong> has been verified.</p>
        <p class="redirect-note">${redirectMessage}</p>
        <p><a href="${redirectUrl}">Click here if not redirected automatically</a></p>
    </div>
</body>
</html>`;
}

function getErrorHTML(message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Verification Failed</title>
    <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
        .error { color: #f44336; }
        a { color: #4f46e5; text-decoration: none; font-weight: bold; }
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
</html>`;
}
