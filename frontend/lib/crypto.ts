/**
 * Derives a shared encryption key from two Ethereum addresses
 * This ensures both users can encrypt/decrypt messages with the same key
 * Uses the Web Crypto API's SubtleCrypto for AES-256-GCM encryption
 */
export async function deriveSharedKey(address1: string, address2: string): Promise<CryptoKey> {
    // Sort addresses to ensure consistent key derivation regardless of order
    const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
    const combined = sorted[0] + sorted[1].slice(2); // Remove 0x from second address

    // Use SHA-256 hash as the key material (available in Web Crypto API)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined));
    return await crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a message using AES-256-GCM
 * Returns encrypted data and nonce as base64 strings
 */
export async function encryptMessage(
    message: string,
    address1: string,
    address2: string
): Promise<{ encrypted: string; nonce: string }> {
    try {
        const key = await deriveSharedKey(address1, address2);

        // Generate a random 96-bit nonce (12 bytes)
        const nonce = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the message
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
            },
            key,
            new TextEncoder().encode(message)
        );

        // Convert to base64 for storage
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
        const nonceBase64 = btoa(String.fromCharCode(...nonce));

        return {
            encrypted: encryptedBase64,
            nonce: nonceBase64,
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt message');
    }
}

/**
 * Decrypts a message using AES-256-GCM
 */
export async function decryptMessage(
    encryptedBase64: string,
    nonceBase64: string,
    address1: string,
    address2: string
): Promise<string> {
    try {
        const key = await deriveSharedKey(address1, address2);

        // Convert from base64
        const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const nonce = Uint8Array.from(atob(nonceBase64), c => c.charCodeAt(0));

        // Decrypt the message
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
            },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedData);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt message');
    }
}
