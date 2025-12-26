// ============================================
// FILE: lib/utils.ts
// ============================================
import { randomBytes } from 'crypto';
import { verifyMessage, createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS as Address;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

if (!PROFILE_NFT_ADDRESS) throw new Error('NEXT_PUBLIC_PROFILE_NFT_ADDRESS is not set');
if (!ALCHEMY_API_KEY) throw new Error('ALCHEMY_API_KEY is not set');

const PROFILE_NFT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
] as const;

// -----------------------------
// Base Mainnet client (using Alchemy)
// -----------------------------
const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
});

// ============================================
// Check if a wallet owns at least one NFT
// ============================================
export async function checkNftOwnership(address: string): Promise<boolean> {
  try {
    console.log('🔍 Checking NFT ownership for:', address);
    console.log('📍 Contract:', PROFILE_NFT_ADDRESS);
    console.log('🌐 Network: Base Mainnet (via Alchemy)');

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

// ============================================
// Hash photo URL for on-chain reference
// ============================================
export function calculatePhotoHash(photoUrl: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(photoUrl).digest('hex');
  return '0x' + hash;
}

// ============================================
// Verify wallet signature (viem - works with Base App)
// ============================================
export async function verifyWalletSignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const normalizedAddress = address.toLowerCase();
    const normalizedSignature = signature.startsWith('0x') ? signature : `0x${signature}`;

    console.log('🔐 Verifying signature:', {
      addressLength: normalizedAddress.length,
      signatureLength: normalizedSignature.length,
      messageLength: message.length,
      addressPreview: normalizedAddress.slice(0, 10) + '...',
      signaturePreview: normalizedSignature.slice(0, 10) + '...',
    });

    // ✅ viem expects a raw hex signature from signMessage
    const isValid = await verifyMessage({
      address: normalizedAddress as `0x${string}`,
      message,
      signature: normalizedSignature as `0x${string}`,
    });

    console.log('✅ Signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// ============================================
// Generate a random token
// ============================================
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}
