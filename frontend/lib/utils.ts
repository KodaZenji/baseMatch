import { randomBytes } from 'crypto';
import { verifyMessage } from 'viem';
import * as brevo from '@getbrevo/brevo';
import { createPublicClient, http, Address } from 'viem';
import { baseSepolia, base } from 'viem/chains';

// --- VIEM/WAGMI CONFIGURATION ---

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS as Address;

// Minimal ABI for checking ownership (balanceOf function)
const PROFILE_NFT_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ type: 'address', name: 'owner' }],
        outputs: [{ type: 'uint256', name: '' }],
    },
] as const;

// Setup a Viem Public Client for server-side contract reads
const publicClient = createPublicClient({
    chain: process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') || process.env.NODE_ENV === 'development'
        ? baseSepolia
        : base, // Use base mainnet for production
    transport: http(),
});

/**
 * Check if the given address owns the Profile NFT (balance > 0).
 */
export async function checkNftOwnership(address: string): Promise<boolean> {
    if (!PROFILE_NFT_ADDRESS) {
        console.error("NFT Contract address is not set.");
        return false;
    }

    try {
        const balance = await publicClient.readContract({
            address: PROFILE_NFT_ADDRESS,
            abi: PROFILE_NFT_ABI,
            functionName: 'balanceOf',
            args: [address as Address],
        });

        return balance > BigInt(0);
    } catch (error) {
        console.error('Error checking NFT balance:', error);
        return false;
    }
}


/**
 * Calculate photo hash using a stable SHA-256 function.
 */
export function calculatePhotoHash(photoUrl: string): string {
    // Use Node's 'crypto' module, which is available in Next.js API routes
    const crypto = require('crypto');

    // Hash the URL and return as a 64-character hex string with the '0x' prefix
    const hash = crypto.createHash('sha256').update(photoUrl).digest('hex');

    return '0x' + hash;
}

/**
 * Verify a wallet signature using viem
 */
export async function verifyWalletSignature(
    message: string,
    signature: string,
    address: string
): Promise<boolean> {
    try {
        // Ensure address has 0x prefix and is lowercase
        const addr = address.startsWith('0x') ? address.toLowerCase() : `0x${address}`.toLowerCase();

        console.log('Verifying signature:', {
            messageLength: message.length,
            signatureLength: signature.length,
            addressFormat: addr.substring(0, 4) + '...'
        });

        // Handle different signature formats
        let sig: `0x${string}`;

        if (signature.startsWith('0x')) {
            // Standard hex signature
            sig = signature as `0x${string}`;
        } else {
            // Try to parse as base64 or other format if needed
            try {
                // Check if it's a valid hex after removing potential prefixes
                const cleanSig = signature.replace(/[^a-fA-F0-9]/g, '');
                if (cleanSig.length === 130 || cleanSig.length === 132) { // 65 bytes (r + s + v) in hex
                    sig = `0x${cleanSig}` as `0x${string}`;
                } else {
                    // Assume it's a hex string without 0x prefix
                    sig = `0x${signature}` as `0x${string}`;
                }
            } catch {
                // If all else fails, try the original signature as hex
                sig = `0x${signature}` as `0x${string}`;
            }
        }

        console.log('Processing signature format:', {
            originalLength: signature.length,
            processedSignature: sig.substring(0, 10) + '...',
            processedLength: sig.length
        });

        const isValid = await verifyMessage({
            address: addr as `0x${string}`,
            message,
            signature: sig
        });

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        // Log additional info for debugging
        console.error('Signature details:', {
            messageLength: message.length,
            signatureLength: signature.length,
            signaturePrefix: signature.substring(0, 4),
            address: address
        });
        return false;
    }
}

/**
 * Generate a random UUID token for verification
 */
export function generateToken(): string {
    return randomBytes(32).toString('hex');
}


