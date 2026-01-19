// /frontend/lib/avatarStorage.ts

/**
 * Avatar storage utilities using Supabase Storage
 * Downloads IPFS avatars and caches them in Supabase bucket for faster loading
 */

import { supabaseService } from '@/lib/supabase.server';

const SUPABASE_BUCKET = 'profile-images'; // ✅ Using your existing bucket!
const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
];

/**
 * Convert IPFS URL to HTTP gateway URL
 */
function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl) return '';
  
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl;
  }
  
  if (ipfsUrl.startsWith('ipfs://')) {
    let cid = ipfsUrl.replace('ipfs://', '');
    if (cid.startsWith('ipfs/')) {
      cid = cid.replace('ipfs/', '');
    }
    return `${IPFS_GATEWAYS[0]}${cid}`;
  }
  
  return ipfsUrl;
}

/**
 * Extract CID from IPFS URL for use as filename
 */
function extractCID(ipfsUrl: string): string {
  if (!ipfsUrl) return '';
  
  let cid = ipfsUrl.replace('ipfs://', '');
  if (cid.startsWith('ipfs/')) {
    cid = cid.replace('ipfs/', '');
  }
  
  // Handle path-style IPFS URLs (CID/path)
  const cidOnly = cid.split('/')[0];
  return cidOnly;
}

/**
 * Check if avatar already exists in Supabase Storage
 */
async function avatarExistsInSupabase(cid: string): Promise<string | null> {
  try {
    // Check in base-account-avatars subfolder
    const { data, error } = await supabaseService
      .storage
      .from(SUPABASE_BUCKET)
      .list('base-account-avatars', {
        search: cid
      });

    if (error) {
      console.log('Error checking Supabase storage:', error);
      return null;
    }

    if (data && data.length > 0) {
      // Return public URL
      const { data: urlData } = supabaseService
        .storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(`base-account-avatars/${data[0].name}`);
      
      console.log('✅ Avatar found in Supabase cache:', cid);
      return urlData.publicUrl;
    }

    return null;
  } catch (error) {
    console.error('Error checking Supabase:', error);
    return null;
  }
}

/**
 * Download avatar from IPFS and upload to Supabase Storage
 */
async function cacheAvatarToSupabase(ipfsUrl: string, cid: string): Promise<string | null> {
  try {
    const httpUrl = ipfsToHttp(ipfsUrl);
    console.log('📥 Downloading avatar from IPFS:', httpUrl.substring(0, 50) + '...');

    // Download from IPFS
    const response = await fetch(httpUrl);
    if (!response.ok) {
      console.error('Failed to download from IPFS');
      return null;
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const filename = `base-account-avatars/${cid}.${ext}`;

    // Upload to Supabase Storage in base-account-avatars subfolder
    const { data, error } = await supabaseService
      .storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: true
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabaseService
      .storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filename);

    console.log('✅ Avatar cached to Supabase:', filename);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error caching avatar:', error);
    return null;
  }
}

/**
 * Main function: Get avatar URL (from Supabase cache or IPFS)
 * Returns Supabase URL if cached, otherwise downloads and caches it
 */
export async function getAvatarUrl(ipfsUrl: string | null | undefined): Promise<string> {
  if (!ipfsUrl) return '';

  // Already an HTTP URL (not IPFS) - return as is
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    // Check if it's already a Supabase URL
    if (ipfsUrl.includes('supabase')) {
      return ipfsUrl;
    }
    return ipfsUrl;
  }

  // Extract CID from IPFS URL
  const cid = extractCID(ipfsUrl);
  if (!cid) {
    console.log('⚠️ Could not extract CID from:', ipfsUrl);
    return ipfsToHttp(ipfsUrl); // Fallback to gateway
  }

  // Check if already cached in Supabase
  const cachedUrl = await avatarExistsInSupabase(cid);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Not cached - download and cache it
  console.log('📦 Caching avatar to Supabase...');
  const supabaseUrl = await cacheAvatarToSupabase(ipfsUrl, cid);
  
  if (supabaseUrl) {
    return supabaseUrl;
  }

  // Fallback to IPFS gateway if caching failed
  console.log('⚠️ Falling back to IPFS gateway');
  return ipfsToHttp(ipfsUrl);
}

/**
 * Quick version: Just convert IPFS to Supabase-friendly URL without caching
 * Use this for immediate display, then cache in background
 */
export function getQuickAvatarUrl(ipfsUrl: string | null | undefined): string {
  if (!ipfsUrl) return '';
  
  // Already HTTP
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl;
  }
  
  // Convert IPFS to gateway URL
  return ipfsToHttp(ipfsUrl);
}
