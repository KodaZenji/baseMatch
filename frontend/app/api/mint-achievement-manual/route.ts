import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ACHIEVEMENT_ABI, CONTRACTS } from '@/lib/contracts';

export async function POST(request: Request) {
  try {
    const { userAddress, achievementType } = await request.json();

    if (!userAddress || !achievementType) {
      return NextResponse.json(
        { error: 'userAddress and achievementType required' },
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

    // Call mintAchievement on the contract
    console.log(`🏆 Minting "${achievementType}" for ${userAddress}`);

    const txHash = await walletClient.writeContract({
      address: achievementAddress,
      abi: ACHIEVEMENT_ABI,
      functionName: 'mintAchievement',
      args: [userAddress as `0x${string}`, achievementType],
    });

    console.log(`✅ Mint transaction sent: ${txHash}`);

    return NextResponse.json({
      success: true,
      txHash,
      message: `Successfully minted "${achievementType}" achievement!`,
      achievementType,
      userAddress,
    });
  } catch (error: any) {
    console.error('❌ Manual mint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mint achievement' },
      { status: 500 }
    );
  }
}
