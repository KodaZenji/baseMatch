import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ACHIEVEMENT_ABI, CONTRACTS } from '@/lib/contracts';

export async function POST(request: Request) {
    try {
        const { newBaseURI } = await request.json();

        if (!newBaseURI) {
            return NextResponse.json(
                { error: 'newBaseURI required' },
                { status: 400 }
            );
        }

        // Get admin wallet
        const privateKeyStr = process.env.ADMIN_PRIVATE_KEY;
        if (!privateKeyStr) {
            return NextResponse.json(
                { error: 'ADMIN_PRIVATE_KEY not set' },
                { status: 500 }
            );
        }

        const privateKeyWithPrefix = privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`;
        const adminAccount = privateKeyToAccount(privateKeyWithPrefix as `0x${string}`);

        // Create wallet client
        const walletClient = createWalletClient({
            account: adminAccount,
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL),
        });

        const achievementAddress = CONTRACTS.ACHIEVEMENT as `0x${string}`;

        // Call setBaseMetadataURI on the contract
        console.log(`🔄 Updating Achievement metadata URI to: ${newBaseURI}`);

        const txHash = await walletClient.writeContract({
            address: achievementAddress,
            abi: ACHIEVEMENT_ABI,
            functionName: 'setBaseMetadataURI',
            args: [newBaseURI],
        });

        console.log(`✅ Metadata update transaction sent: ${txHash}`);

        return NextResponse.json({
            success: true,
            txHash,
            message: 'Achievement metadata URI updated successfully!',
            newBaseURI,
        });
    } catch (error: any) {
        console.error('❌ Metadata update error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update metadata' },
            { status: 500 }
        );
    }
}
