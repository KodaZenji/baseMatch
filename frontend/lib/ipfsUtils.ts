// /frontend/lib/ipfsUtils.ts

/**
 * Converts IPFS URLs to HTTP gateway URLs for browser display
 * Base Account avatars are stored as ipfs:// URLs which need gateway conversion
 */

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

/**
 * Convert ipfs:// URL to HTTP gateway URL
 * @param ipfsUrl - IPFS URL (ipfs://CID or ipfs://ipfs/CID)
 * @param gatewayIndex - Which gateway to use (default: 0 = ipfs.io)
 * @returns HTTP URL that browsers can load
 */
export function convertIpfsToHttp(ipfsUrl: string, gatewayIndex: number = 0): string {
  if (!ipfsUrl) return '';
  
  // Already an HTTP URL - return as is
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl;
  }
  
  // Handle ipfs:// URLs
  if (ipfsUrl.startsWith('ipfs://')) {
    // Remove ipfs:// prefix
    let cid = ipfsUrl.replace('ipfs://', '');
    
    // Some URLs are ipfs://ipfs/CID, remove the extra ipfs/
    if (cid.startsWith('ipfs/')) {
      cid = cid.replace('ipfs/', '');
    }
    
    // Select gateway (with fallback to first one)
    const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
    
    return `${gateway}${cid}`;
  }
  
  // Handle raw CID (no protocol)
  if (!ipfsUrl.includes('://') && !ipfsUrl.startsWith('/')) {
    const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
    return `${gateway}${ipfsUrl}`;
  }
  
  return ipfsUrl;
}

/**
 * Resolves any avatar URL to a browser-displayable format
 * Handles IPFS URLs, HTTP URLs, and data URLs
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return '';
  
  // Data URLs (base64) - return as is
  if (avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  
  // IPFS URLs - convert to gateway
  if (avatarUrl.startsWith('ipfs://')) {
    return convertIpfsToHttp(avatarUrl);
  }
  
  // HTTP/HTTPS URLs - return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Assume it's a raw CID if it doesn't match any pattern
  return convertIpfsToHttp(avatarUrl);
}
