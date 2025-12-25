import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        // Get the raw body for signature verification
        const body = await request.text();

        // Log the incoming webhook for debugging
        console.log('Webhook received:', {
            timestamp: new Date().toISOString(),
            body: body.substring(0, 200) + (body.length > 200 ? '...' : '') // Truncate for security
        });

        // Verify the request is from Farcaster (basic validation)
        const signature = request.headers.get('X-Farcaster-Signature');
        const timestamp = request.headers.get('X-Farcaster-Timestamp');

        // Note: In a production environment, you would want to verify the signature
        // using your Farcaster app's secret key

        if (!signature) {
            console.log('Missing signature in webhook request');
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 401 }
            );
        }

        // Parse the JSON body
        let payload;
        try {
            payload = JSON.parse(body);
        } catch (error) {
            console.error('Invalid JSON in webhook:', error);
            return NextResponse.json(
                { error: 'Invalid JSON' },
                { status: 400 }
            );
        }

        // Process the webhook event based on type
        const eventType = payload.type || payload.event_type || 'unknown';

        console.log('Processing webhook event:', eventType);

        switch (eventType) {
            case 'webhook_challenge':
                // Handle webhook challenge for verification
                console.log('Processing webhook challenge');
                return NextResponse.json({
                    challenge: payload.challenge,
                    status: 'ok'
                });

            case 'cast.created':
            case 'cast.deleted':
                // Handle cast events
                console.log('Processing cast event:', payload);
                // Add your cast processing logic here
                break;

            case 'reaction.created':
            case 'reaction.deleted':
                // Handle reaction events
                console.log('Processing reaction event:', payload);
                // Add your reaction processing logic here
                break;

            case 'follow.created':
            case 'follow.deleted':
                // Handle follow events
                console.log('Processing follow event:', payload);
                // Add your follow processing logic here
                break;

            case 'verification.created':
            case 'verification.deleted':
                // Handle verification events
                console.log('Processing verification event:', payload);
                // Add your verification processing logic here
                break;

            default:
                console.log('Unknown event type:', eventType, payload);
                // Log unknown events but don't error
                break;
        }

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully',
            eventType: eventType
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle other HTTP methods
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Webhooks use POST.' },
        { status: 405 }
    );
}

export async function PUT() {
    return NextResponse.json(
        { error: 'Method not allowed. Webhooks use POST.' },
        { status: 405 }
    );
}