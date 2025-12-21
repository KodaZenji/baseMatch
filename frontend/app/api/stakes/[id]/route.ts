// File: frontend/app/api/stakes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase.server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Stake ID is required'
            }, { status: 400 });
        }

        console.log('🔍 Getting stake by ID:', id);

        const { data: stake, error } = await supabaseService
            .from('stakes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ Database error:', error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        if (!stake) {
            return NextResponse.json({
                success: false,
                error: 'Stake not found'
            }, { status: 404 });
        }

        console.log('✅ Stake found:', stake.id);

        return NextResponse.json({
            success: true,
            stake
        });

    } catch (error) {
        console.error('❌ Get stake error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get stake'
        }, { status: 500 });
    }
}