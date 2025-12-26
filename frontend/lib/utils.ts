// ============================================
// FILE: lib/utils.ts
// ============================================
import { randomBytes } from 'crypto';
import { verifyTypedData, createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';

const PROFILE_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS as Address;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

if (!PROFILE_NFT_ADDRESS) throw new Error('NEXT_PUBLIC_PROFILE_NFT_ADDRESS is not set');
rEr PROFILE_NFT = [
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
// EIP-712 Domain (used for wallet signatures)
// ============================================
export const SIGNING_DOMAIN = {
  name: 'BaseMatch',
  version: '1',
  chainId: 8453, // Base Mainnet
} as const;

// ============================================
// Typed signature structure
// ============================================
export const SIGNING_TYPES = {
  Registration: [
    { name: 'address', type: 'address' },
    { name: 'nonce', type: 'string' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

export function buildRegistrationTypedData(params: {
  address: string;
  nonce: string;
  issuedAt: number;
}) {
  return {
    domain: SIGNING_DOMAIN,
    types: SIGNING_TYPES,
    primaryType: 'Registration', 
    message: {
      address: params.address as Address,
      nonce: params.nonce,
      issuedAt: BigInt(params.issuedAt),
    },
  } as const;
}

// ============================================
// Check if a wallet owns at least one NFT
// ============================================
export async function checkNftOwnership(address: string): Promise<boolean> {
  try {
    console.log('🔍 Checking NFT ownership for:', address);
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
// Verify wallet signature (EIP-712, Base App compatible)
// ============================================
export async function verifyWalletSignature(
  signature: string,
  params: {
    address: string;
    nonce: string;
    issuedAt: number;
  }
): Promise<boolean> {
  try {
    console.log('🔐 Verifying typed wallet signature:', {
      address: params.address,
      nonce: params.nonce,
      issuedAt: params.issuedAt,
      signatureLength: signature.length,
    });

    const typedData = buildRegistrationTypedData({
      address: params.address,
      nonce: params.nonce,
      issuedAt: params.issuedAt,
    });

    const isValid = verifyTypedData({
      address: params.address as Address,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature: signature.startsWith('0x') ? (signature as `0x${string}`) : (`0x${signature}` as `0x${string}`),
    });

    console.log('✅ Typed signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Typed signature verification failed:', error);
    return false;
  }
}

// ============================================
// Generate a random token
// ============================================
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}
