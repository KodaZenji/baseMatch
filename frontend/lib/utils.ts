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
            const cleanSig = signature.substring(2); // Remove '0x' prefix

            // Check if this looks like a standard signature (65 bytes = 130 hex chars)
            if (cleanSig.length === 130) {
                // Standard 65-byte signature (r + s + v)
                sig = signature as `0x${string}`;
            } else if (cleanSig.length > 130) {
                // This might be a serialized signature from Base App browser
                // Try to extract the actual signature from the serialized format
                try {
                    // For Base App browser, signatures might be in a serialized format
                    // Often the actual signature is embedded in the data
                    if (cleanSig.length === 448) { // 450 chars minus '0x' = 448
                        // Try extracting from the end (last 130 chars for r+s+v)
                        const actualSig = cleanSig.slice(-130);
                        sig = `0x${actualSig}` as `0x${string}`;
                        console.log('Extracted signature from Base App format');
                    } else {
                        // For other longer signatures, try to extract the last 130 chars
                        if (cleanSig.length > 130) {
                            const actualSig = cleanSig.slice(-130);
                            sig = `0x${actualSig}` as `0x${string}`;
                            console.log('Extracted signature from longer format');
                        } else {
                            sig = signature as `0x${string}`;
                        }
                    }
                } catch (extractError) {
                    console.error('Failed to extract signature:', extractError);
                    sig = signature as `0x${string}`;
                }
            } else {
                // Some other format, try to use as-is
                sig = signature as `0x${string}`;
            }
        } else {
            // No 0x prefix, try to add it
            sig = `0x${signature}` as `0x${string}`;
        }

        console.log('Processing signature format:', {
            originalLength: signature.length,
            processedSignature: sig.substring(0, 10) + '...',
            processedLength: sig.length
        });

        // Additional validation - ensure signature is the right length for verifyMessage
        if (sig.length !== 132) { // 0x + 130 hex chars = 132
            console.warn('Signature length is not standard, attempting to normalize:', {
                expected: 132,
                actual: sig.length,
                signature: sig
            });

            // If it's too long, try to extract the actual signature part
            if (sig.length > 132) {
                // Extract the last 130 hex characters (standard signature part)
                const sigPart = sig.substring(sig.length - 130);
                sig = `0x${sigPart}` as `0x${string}`;
                console.log('Normalized signature length');
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


