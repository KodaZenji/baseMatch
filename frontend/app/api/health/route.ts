import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // Test database connectivity by performing a simple operation
        await db.cleanupExpiredTokens();

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'email-verification'
        });
    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            service: 'email-verification',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}