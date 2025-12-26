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
            addressFormat: addr.substring(0, 6) + '...',
            messagePreview: message.substring(0, 50) + '...'
        });

        let sig: `0x${string}`;

        // Handle different signature formats
        if (signature.startsWith('0x')) {
            const cleanSig = signature.substring(2);
            console.log('Clean signature length (without 0x):', cleanSig.length);

            if (cleanSig.length === 130) {
                // Standard signature
                sig = signature as `0x${string}`;
                console.log('Using standard signature format');
            } else if (cleanSig.length === 448) {
                // Base App format - extract last 130 chars
                const actualSig = cleanSig.slice(-130);
                sig = `0x${actualSig}` as `0x${string}`;
                console.log('Extracted signature from Base App format (448 chars)');
            } else if (cleanSig.length > 130) {
                // Other long format - extract last 130 chars
                const actualSig = cleanSig.slice(-130);
                sig = `0x${actualSig}` as `0x${string}`;
                console.log(`Extracted signature from long format (${cleanSig.length} chars)`);
            } else {
                console.warn('Signature too short, using as-is');
                sig = signature as `0x${string}`;
            }
        } else {
            // No 0x prefix
            if (signature.length === 130) {
                sig = `0x${signature}` as `0x${string}`;
            } else if (signature.length > 130) {
                const actualSig = signature.slice(-130);
                sig = `0x${actualSig}` as `0x${string}`;
            } else {
                sig = `0x${signature}` as `0x${string}`;
            }
        }

        console.log('Final signature:', {
            length: sig.length,
            preview: sig.substring(0, 20) + '...'
        });

        // Verify the signature
        console.log('Attempting verification with viem...');
        const isValid = await verifyMessage({
            address: addr as `0x${string}`,
            message,
            signature: sig
        });

        console.log('✅ Signature verification result:', isValid);
        return isValid;

    } catch (error) {
        console.error('❌ Signature verification error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        
        // Log more details about what went wrong
        if (error instanceof Error) {
            if (error.message.includes('Invalid signature')) {
                console.error('The signature does not match the message/address');
            } else if (error.message.includes('address')) {
                console.error('Address format issue');
            } else if (error.message.includes('message')) {
                console.error('Message format issue');
            }
        }
        
        return false;
    }
}
