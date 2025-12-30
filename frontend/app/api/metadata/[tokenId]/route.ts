import { NextRequest } from 'next/server';

/* -------------------------------------------------------------------------- */
/*                               Network Config                                */
/* -------------------------------------------------------------------------- */

const NETWORKS = {
  'base-sepolia': {
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532,
    contractAddress:
      process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS ||
      '0x2722CB9D5543759242F81507081866f082C1480d',
    name: 'Base Sepolia'
  },
  'base-mainnet': {
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    contractAddress:
      process.env.NEXT_PUBLIC_PROFILE_NFT_MAINNET ||
      '0x62FCf1F4217fc2Bc039648A2c5cFfb73212B0d47',
    name: 'Base Mainnet'
  }
} as const;

type NetworkKey = keyof typeof NETWORKS;

function getNetworkConfig() {
  const key =
    (process.env.NEXT_PUBLIC_NETWORK as NetworkKey) || 'base-mainnet';

  return NETWORKS[key] ?? NETWORKS['base-mainnet'];
}

/* -------------------------------------------------------------------------- */
/*                             Static Constants                                 */
/* -------------------------------------------------------------------------- */

const SUPABASE_IMAGE_BASE_URL =
  'https://xvynefwulsgbyzkvqmuo.supabase.co/storage/v1/object/public/nft-images';

/* -------------------------------------------------------------------------- */
/*                         Low-level RPC Utilities                              */
/* -------------------------------------------------------------------------- */

/**
 * Encode getProfileByTokenId(uint256)
 * selector = 0x6c7e6b64
 */
function encodeGetProfileByTokenId(tokenId: string): string {
  return `0x6c7e6b64${tokenId.padStart(64, '0')}`;
}

async function callContract(
  rpcUrl: string,
  contract: string,
  data: string
): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: contract, data }, 'latest']
    })
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result ?? '0x';
}

/* -------------------------------------------------------------------------- */
/*                          Decode (Safe Fallback)                              */
/* -------------------------------------------------------------------------- */

function hexToBigInt(hex: string): bigint {
  return BigInt(hex.startsWith('0x') ? hex : '0x' + hex);
}

function hexToString(hex: string): string {
  if (!hex || hex === '0x') return '';

  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Check if this is a dynamic string (starts with length offset)
  const lengthOffset = cleanHex.substring(0, 64);
  const dataOffset = cleanHex.substring(64, 128);

  // If the first 64 chars represent length, it's a dynamic string
  const length = Number(hexToBigInt('0x' + lengthOffset));

  if (length > 0) {
    // Extract string data after length offset and data offset (128 chars)
    const stringData = cleanHex.substring(128, 128 + length * 2);

    // Convert hex string to bytes and then to UTF-8 string
    try {
      const bytes = new Uint8Array(stringData.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return '';
    }
  } else {
    // If not dynamic, try direct conversion
    try {
      const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return '';
    }
  }
}

function decodeProfileResponse(data: string) {
  // NOTE: intentionally defensive — prevents build/runtime crashes
  try {
    if (!data || data === '0x') {
      return {
        tokenId: '0',
        name: 'BaseMatch Profile',
        birthYear: 0,
        gender: 'Not specified',
        interests: '',
        photoUrl: '',
        email: '',
        exists: true
      };
    }

    // Remove '0x' prefix if present
    const hexData = data.startsWith('0x') ? data.slice(2) : data;

    // Decode Profile struct fields:
    // 1. tokenId (uint256) - 32 bytes
    // 2. name (string) - dynamic
    // 3. age (uint8) - 32 bytes (but only 1 byte is meaningful)
    // 4. gender (string) - dynamic
    // 5. interests (string) - dynamic
    // 6. photoUrl (string) - dynamic
    // 7. email (string) - dynamic
    // 8. exists (bool) - 32 bytes
    // 9. birthYear (uint256) - 32 bytes

    let offset = 0;

    // tokenId (uint256) - first 32 bytes
    const tokenIdHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const tokenId = hexToBigInt(tokenIdHex).toString();

    // name (string) - next 32 bytes contain offset to actual string data
    const nameOffsetHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const nameOffset = Number(hexToBigInt(nameOffsetHex)) * 2; // multiply by 2 since we're working with hex chars

    // age (uint8) - next 32 bytes, but only last 2 chars are meaningful
    const ageHex = hexData.substring(offset, offset + 64);
    offset += 64;
    // For compatibility with old field, but we'll use birthYear

    // gender (string) - next 32 bytes contain offset
    const genderOffsetHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const genderOffset = Number(hexToBigInt(genderOffsetHex)) * 2;

    // interests (string) - next 32 bytes contain offset
    const interestsOffsetHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const interestsOffset = Number(hexToBigInt(interestsOffsetHex)) * 2;

    // photoUrl (string) - next 32 bytes contain offset
    const photoUrlOffsetHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const photoUrlOffset = Number(hexToBigInt(photoUrlOffsetHex)) * 2;

    // email (string) - next 32 bytes contain offset
    const emailOffsetHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const emailOffset = Number(hexToBigInt(emailOffsetHex)) * 2;

    // exists (bool) - next 32 bytes
    const existsHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const exists = hexToBigInt(existsHex) !== 0n;

    // birthYear (uint256) - next 32 bytes
    const birthYearHex = hexData.substring(offset, offset + 64);
    offset += 64;
    const birthYear = Number(hexToBigInt(birthYearHex));

    // Now extract the actual string values using their offsets
    const name = hexToString('0x' + hexData.substring(nameOffset, nameOffset + 1024)); // arbitrary length limit
    const gender = hexToString('0x' + hexData.substring(genderOffset, genderOffset + 1024));
    const interests = hexToString('0x' + hexData.substring(interestsOffset, interestsOffset + 2048));
    const photoUrl = hexToString('0x' + hexData.substring(photoUrlOffset, photoUrlOffset + 2048));
    const email = hexToString('0x' + hexData.substring(emailOffset, emailOffset + 1024));

    return {
      tokenId,
      name,
      birthYear,
      gender,
      interests,
      photoUrl,
      email,
      exists
    };
  } catch (error) {
    console.error('Error decoding profile response:', error);
    // Fallback to default values
    return {
      tokenId: '0',
      name: 'BaseMatch Profile',
      birthYear: 0,
      gender: 'Not specified',
      interests: '',
      photoUrl: '',
      email: '',
      exists: true
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                         On-chain Profile Fetch                               */
/* -------------------------------------------------------------------------- */

async function fetchOnChainProfileData(
  rpcUrl: string,
  contract: string,
  tokenId: string
) {
  try {
    const encoded = encodeGetProfileByTokenId(tokenId);
    const response = await callContract(rpcUrl, contract, encoded);

    if (response !== '0x') {
      const decoded = decodeProfileResponse(response);
      if (decoded?.exists) {
        return { ...decoded, tokenId };
      }
    }
  } catch (err) {
    console.error('RPC fetch failed:', err);
  }

  return {
    tokenId,
    name: `BaseMatch Profile #${tokenId}`,
    birthYear: 0,
    gender: 'Not specified',
    interests: '',
    photoUrl: '',
    email: '',
    exists: false
  };
}

/* -------------------------------------------------------------------------- */
/*                           Metadata Helpers                                   */
/* -------------------------------------------------------------------------- */

function constructImageUrl(tokenId: string, photoUrl?: string) {
  if (photoUrl?.startsWith('data:')) return photoUrl;
  return `${SUPABASE_IMAGE_BASE_URL}/profile-${tokenId}.jpg`;
}

function generateMetadata(profile: any, networkName: string) {
  // Calculate current age from birth year
  const currentYear = new Date().getFullYear();
  const calculatedAge = currentYear - profile.birthYear;

  return {
    name: `${profile.name} #${profile.tokenId}`,
    description: `BaseMatch Profile NFT - Soulbound Token on ${networkName}`,
    image: constructImageUrl(profile.tokenId, profile.photoUrl),
    attributes: [
      { trait_type: 'Age', value: calculatedAge },
      { trait_type: 'Birth Year', value: profile.birthYear },
      { trait_type: 'Gender', value: profile.gender },
      { trait_type: 'Interests', value: profile.interests || 'Not specified' },
      { trait_type: 'Network', value: networkName },
      { trait_type: 'Transferable', value: false }
    ],
    external_url: `https://basematch.app/profile/${profile.tokenId}`
  };
}

/* -------------------------------------------------------------------------- */
/*                               API HANDLERS                                   */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  if (!tokenId || isNaN(Number(tokenId))) {
    return Response.json(
      { error: 'Invalid tokenId' },
      { status: 400 }
    );
  }

  const network = getNetworkConfig();

  console.log('🌐 Network Configuration:', {
    network: network.name,
    contractAddress: network.contractAddress,
    env: process.env.NODE_ENV
  });

  const profile = await fetchOnChainProfileData(
    network.rpcUrl,
    network.contractAddress,
    tokenId
  );

  const metadata = generateMetadata(profile, network.name);

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  return new Response(null, {
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  });
}
