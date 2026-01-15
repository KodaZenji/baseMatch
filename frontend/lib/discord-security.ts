// frontend/lib/discord-security.ts
import crypto from 'crypto';

// Auto-generate and cache secret if not provided
let cachedSecret: string | null = null;

function getOrGenerateSecret(): string {
  // Try to get from environment first
  if (process.env.DISCORD_STATE_SECRET) {
    return process.env.DISCORD_STATE_SECRET;
  }

  // If not in production, generate and cache a temporary one
  if (process.env.NODE_ENV !== 'production') {
    if (!cachedSecret) {
      cachedSecret = crypto.randomBytes(64).toString('base64');
      console.log('🔑 Generated temporary secret for development');
      console.log('⚠️  Add this to your .env.local for production:');
      console.log(`DISCORD_STATE_SECRET=${cachedSecret}`);
    }
    return cachedSecret;
  }

  // Production requires explicit secret
  throw new Error(
    'DISCORD_STATE_SECRET is required in production. ' +
    'Visit https://basematch.app/admin/generate-secret to create one.'
  );
}

const SECRET_KEY = getOrGenerateSecret();

interface StateData {
  wallet: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a cryptographically secure state token
 */
export function generateStateToken(walletAddress: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  
  const stateData: StateData = {
    wallet: walletAddress.toLowerCase(),
    timestamp,
    nonce,
  };

  // Create HMAC signature
  const message = JSON.stringify(stateData);
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('hex');

  // Combine data + signature
  const token = {
    data: stateData,
    signature,
  };

  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

/**
 * Verify state token is valid and not tampered with
 */
export function verifyStateToken(token: string): string | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf-8')
    );

    const { data, signature } = decoded;

    // Verify signature
    const message = JSON.stringify(data);
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(message)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid signature detected');
      return null;
    }

    // Check expiry (15 minutes)
    const age = Date.now() - data.timestamp;
    if (age > 15 * 60 * 1000) {
      console.warn('⚠️ Expired token');
      return null;
    }

    return data.wallet;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Simple in-memory nonce tracking
const usedNonces = new Set<string>();

export function markNonceAsUsed(token: string): void {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf-8')
    );
    usedNonces.add(decoded.data.nonce);
    
    // Clean up after 1 hour
    setTimeout(() => {
      usedNonces.delete(decoded.data.nonce);
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error('Error marking nonce:', error);
  }
}

export function isNonceUsed(token: string): boolean {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf-8')
    );
    return usedNonces.has(decoded.data.nonce);
  } catch (error) {
    return true;
  }
}
