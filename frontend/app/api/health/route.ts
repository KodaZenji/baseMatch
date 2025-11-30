import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Simple health check
        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'basematch'
        });
    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            service: 'basematch',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}