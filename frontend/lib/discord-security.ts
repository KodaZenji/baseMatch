import crypto from 'crypto';

// Auto-generate and cache secret if not provided
let cachedSecret: string | null = null;

function getOrGenerateSecret(): string {
  if (process.env.DISCORD_STATE_SECRET) {
    return process.env.DISCORD_STATE_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (!cachedSecret) {
      cachedSecret = crypto.randomBytes(64).toString('base64');
      console.log('🔑 Generated temporary secret for development');
      console.log('⚠️  Add this to your .env.local for production:');
      console.log(`DISCORD_STATE_SECRET=${cachedSecret}`);
    }
    return cachedSecret;
  }

  throw new Error(
    'DISCORD_STATE_SECRET is required in production. ' +
    'Visit https://basematch.app/admin/generate-secret to create one.'
  );
}

const SECRET_KEY = getOrGenerateSecret();

interface StateData {
  payload: string; // was `wallet` — generalized since wallet isn't known until after Discord connect now
  timestamp: number;
  nonce: string;
}

/**
 * Generate a cryptographically secure state token.
 * `payload` is just an opaque signed string — currently used for campaignId,
 * but not semantically tied to a wallet anymore.
 */
export function generateStateToken(payload: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();

  const stateData: StateData = {
    payload,
    timestamp,
    nonce,
  };

  const message = JSON.stringify(stateData);
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('hex');

  const token = {
    data: stateData,
    signature,
  };

  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

/**
 * Verify state token is valid and not tampered with.
 * Returns the original payload string, or null if invalid/expired.
 */
export function verifyStateToken(token: string): string | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf-8')
    );

    const { data, signature } = decoded;

    const message = JSON.stringify(data);
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(message)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid signature detected');
      return null;
    }

    const age = Date.now() - data.timestamp;
    if (age > 15 * 60 * 1000) {
      console.warn('⚠️ Expired token');
      return null;
    }

    return data.payload;
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
