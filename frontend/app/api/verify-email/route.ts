import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        // Validate input
        if (!token || !email) {
            const html = `
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
              }
              .error { color: #f44336; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 class="error">✗ Verification Failed</h1>
              <p>Invalid verification link. Please make sure you're using the complete link from your email.</p>
              <p><a href="/" style="color: #4f46e5;">Return to BaseMatch</a></p>
          </div>
      </body>
      </html>
      `;

            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html',
                },
                status: 400
            });
        }

        // Look up the verification token in Supabase
        const { data: verificationToken, error: tokenError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .single();

        // Check if token exists and matches the email
        if (tokenError || !verificationToken || verificationToken.email !== email) {
            const html = `
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
              }
              .error { color: #f44336; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 class="error">✗ Verification Failed</h1>
              <p>The verification link is invalid or has expired.</p>
              <p><a href="/" style="color: #4f46e5;">Return to BaseMatch</a></p>
          </div>
      </body>
      </html>
      `;

            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html',
                },
                status: 400
            });
        }

        // Check if token is expired
        if (new Date(verificationToken.expires_at) < new Date()) {
            // Delete expired token
            await supabaseService
                .from('email_verifications')
                .delete()
                .eq('token', token);

            const html = `
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
              }
              .error { color: #f44336; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 class="error">✗ Verification Failed</h1>
              <p>The verification link has expired. Please request a new verification email.</p>
              <p><a href="/" style="color: #4f46e5;">Return to BaseMatch</a></p>
          </div>
      </body>
      </html>
      `;

            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html',
                },
                status: 400
            });
        }

        // Mark the email as verified in the users table
        const { data: user, error: updateError } = await supabaseService
            .from('users')
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('wallet_address', verificationToken.wallet_address)
            .select()
            .single();

        if (updateError) throw updateError;

        // Delete the used token
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        // Return HTML response with success message
        const html = `
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
            }
            .success { color: #4CAF50; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="success">✓ Email Verified Successfully!</h1>
            <p>Your email address ${email} has been verified.</p>
            <p>You can now close this window and return to the app.</p>
            <p><a href="/" style="color: #4f46e5;">Return to BaseMatch</a></p>
        </div>
    </body>
    </html>
    `;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error verifying email:', error);

        // Return HTML response with error message
        const html = `
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
            }
            .error { color: #f44336; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="error">✗ Verification Failed</h1>
            <p>There was an error verifying your email address.</p>
            <p>Please try again or contact support.</p>
            <p><a href="/" style="color: #4f46e5;">Return to BaseMatch</a></p>
        </div>
    </body>
    </html>
    `;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            },
            status: 500
        });
    }
}

// POST endpoint for API-based verification (like in your example)
export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Find verification token
        const { data: verification, error: verifyError } = await supabaseService
            .from('email_verifications')
            .select('*')
            .eq('token', token)
            .single();

        if (verifyError || !verification) {
            return NextResponse.json(
                { error: 'Invalid verification token' },
                { status: 400 }
            );
        }

        // Check if token expired
        if (new Date(verification.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Verification token has expired' },
                { status: 400 }
            );
        }

        // Mark email as verified
        const { data: user, error: updateError } = await supabaseService
            .from('users')
            .update({
                email_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('wallet_address', verification.wallet_address)
            .select()
            .single();

        if (updateError) throw updateError;

        // Delete used token
        await supabaseService
            .from('email_verifications')
            .delete()
            .eq('token', token);

        return NextResponse.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to verify email' },
            { status: 500 }
        );
    }
}