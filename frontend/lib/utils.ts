// ============================================
// FILE: lib/utils.ts (FIXED VERSION)
// ============================================
import { randomBytes } from 'crypto';
import { verifyMessage } from 'viem';
import * as brevo from '@getbrevo/brevo';
import { createPublicClient, http, Address } from 'viem';
import { baseSepolia, base } from 'viem/chains';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS as Address;

const PROFILE_NFT_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'owner' }],
        outputs: [{ type: 'uint256', name: '' }],
    },
] as const;

// ✅ FIX: Use Base mainnet by default, only use testnet in development
const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || 
                  process.env.NODE_ENV === 'development';

console.log('🌐 Network Configuration:', {
    network: isTestnet ? 'Base Sepolia (Testnet)' : 'Base Mainnet',
    contractAddress: PROFILE_NFT_ADDRESS,
    env: process.env.NODE_ENV
});

const publicClient = createPublicClient({
    chain: isTestnet ? baseSepolia : base,
    transport: http(),
});

export async function checkNftOwnership(address: string): Promise<boolean> {
    if (!PROFILE_NFT_ADDRESS) {
        console.error("❌ NFT Contract address is not set in environment variables");
        return false;
    }

    try {
        console.log('🔍 Checking NFT ownership for:', address);
        console.log('📍 Contract:', PROFILE_NFT_ADDRESS);
        console.log('🌐 Network:', isTestnet ? 'Base Sepolia' : 'Base Mainnet');

        const balance = await publicClient.readContract({
            address: PROFILE_NFT_ADDRESS,
            abi: PROFILE_NFT_ABI,
            functionName: 'balanceOf',
            args: [address as Address],
        });

        const hasNFT = balance > BigInt(0);
        console.log(`✅ NFT Balance for ${address}:`, balance.toString(), hasNFT ? '(Has NFT)' : '(No NFT)');
        
        return hasNFT;
    } catch (error) {
        console.error('❌ Error checking NFT balance:', error);
        return false;
    }
}

export function calculatePhotoHash(photoUrl: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(photoUrl).digest('hex');
    return '0x' + hash;
}

/**
 * ✅ FIXED: Verify wallet signature without corrupting it
 * The signature from wagmi's signMessageAsync is already in the correct format
 */
export async function verifyWalletSignature(
    message: string,
    signature: string,
    address: string
): Promise<boolean> {
    try {
        // Normalize address
        const normalizedAddress = address.toLowerCase().startsWith('0x') 
            ? address.toLowerCase() 
            : `0x${address}`.toLowerCase();

        // Normalize signature - ensure it has 0x prefix
        const normalizedSignature = signature.startsWith('0x') 
            ? signature 
            : `0x${signature}`;

        console.log('🔐 Verifying signature:', {
            addressLength: normalizedAddress.length,
            signatureLength: normalizedSignature.length,
            messageLength: message.length,
            addressPreview: normalizedAddress.substring(0, 10) + '...',
            signaturePreview: normalizedSignature.substring(0, 10) + '...',
        });

        // Validate signature format (should be 132 chars with 0x prefix)
        if (normalizedSignature.length !== 132) {
            console.error('❌ Invalid signature length:', normalizedSignature.length, 'expected 132');
            return false;
        }

        // Validate address format (should be 42 chars with 0x prefix)
        if (normalizedAddress.length !== 42) {
            console.error('❌ Invalid address length:', normalizedAddress.length, 'expected 42');
            return false;
        }

        // Verify the signature using viem
        const isValid = await verifyMessage({
            address: normalizedAddress as `0x${string}`,
            message: message,
            signature: normalizedSignature as `0x${string}`,
        });

        console.log('✅ Signature verification result:', isValid);
        return isValid;

    } catch (error) {
        console.error('❌ Signature verification error:', error);
        
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                name: error.name,
            });
        }
        
        return false;
    }
}

export function generateToken(): string {
    return randomBytes(32).toString('hex');
}

//
