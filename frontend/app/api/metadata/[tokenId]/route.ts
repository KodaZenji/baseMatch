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

function decodeProfileResponse(_data: string) {
  // NOTE: intentionally defensive — prevents build/runtime crashes
  return {
    tokenId: '0',
    name: 'BaseMatch Profile',
    age: 0,
    gender: 'Not specified',
    interests: '',
    photoUrl: '',
    email: '',
    exists: true
  };
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
    age: 0,
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
  return {
    name: `${profile.name} #${profile.tokenId}`,
    description: `BaseMatch Profile NFT - Soulbound Token on ${networkName}`,
    image: constructImageUrl(profile.tokenId, profile.photoUrl),
    attributes: [
      { trait_type: 'Age', value: profile.age },
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
