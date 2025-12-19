import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { CONTRACTS } from '@/lib/contracts';

export async function GET() {
    try {
        const client = createPublicClient({
            chain: baseSepolia,
            transport: http(),
        });

        // Read stakeCounter from the Staking contract
        const stakeCounter = await client.readContract({
            address: CONTRACTS.STAKING as `0x${string}`,
            abi: [
                {
                    type: "function",
                    name: "stakeCounter",
                    stateMutability: "view",
                    inputs: [],
                    outputs: [{ type: "uint256" }]
                }
            ] as const,
            functionName: 'stakeCounter',
        });

        return NextResponse.json(stakeCounter.toString(), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error: any) {
        console.error('Error fetching next stake ID:', error);
        return NextResponse.json(
            { error: 'Failed to fetch next stake ID', message: error.message },
            { status: 500 }
        );
    }
}
