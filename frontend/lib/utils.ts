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

export async function verifyWalletSignature(
    message: string,
    signature: string,
    address: string
): Promise<boolean> {
    try {
        const addr = address.startsWith('0x') ? address.toLowerCase() : `0x${address}`.toLowerCase();

        console.log('Verifying signature:', {
            messageLength: message.length,
            signatureLength: signature.length,
            addressFormat: addr.substring(0, 6) + '...'
        });

        let sig: `0x${string}`;

        if (signature.startsWith('0x')) {
            const cleanSig = signature.substring(2);

            if (cleanSig.length === 130) {
                sig = signature as `0x${string}`;
            } else if (cleanSig.length > 130) {
                if (cleanSig.length === 448) {
                    const actualSig = cleanSig.slice(-130);
                    sig = `0x${actualSig}` as `0x${string}`;
                    console.log('Extracted signature from Base App format');
                } else {
                    const actualSig = cleanSig.slice(-130);
                    sig = `0x${actualSig}` as `0x${string}`;
                    console.log('Extracted signature from longer format');
                }
            } else {
                sig = signature as `0x${string}`;
            }
        } else {
            sig = `0x${signature}` as `0x${string}`;
        }

        if (sig.length !== 132) {
            console.warn('Signature length is not standard, attempting to normalize');
            if (sig.length > 132) {
                const sigPart = sig.substring(sig.length - 130);
                sig = `0x${sigPart}` as `0x${string}`;
            }
        }

        const isValid = await verifyMessage({
            address: addr as `0x${string}`,
            message,
            signature: sig
        });

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

export function generateToken(): string {
    return randomBytes(32).toString('hex');
}
