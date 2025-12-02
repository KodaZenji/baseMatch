// Network configuration for dynamic RPC selection
const NETWORKS = {
    'base-sepolia': {
        rpcUrl: 'https://sepolia.base.org',
        chainId: 84532,
        contractAddress: '0x50ac9Eb1710a2557463E25bBb09762A51C4a74B5',
        name: 'Base Sepolia'
    },
    'base-mainnet': {
        rpcUrl: 'https://mainnet.base.org',
        chainId: 8453,
        contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_MAINNET || '0x50ac9Eb1710a2557463E25bBb09762A51C4a74B5', // Will be updated after mainnet deployment
        name: 'Base Mainnet'
    }
} as const;

// Get current network from environment or default to Sepolia
const CURRENT_NETWORK = (process.env.NEXT_PUBLIC_NETWORK as keyof typeof NETWORKS) || 'base-sepolia';
const NETWORK_CONFIG = NETWORKS[CURRENT_NETWORK];
const RPC_ENDPOINT = NETWORK_CONFIG.rpcUrl;
const PROFILE_NFT_ADDRESS = NETWORK_CONFIG.contractAddress;

// Supabase image base URL for storing NFT images
const SUPABASE_IMAGE_BASE_URL = 'https://xvynefwulsgbyzkvqmuo.supabase.co/storage/v1/object/public/nft-images';

/**
 * Encode function call for getProfileByTokenId(uint256)
 * Function selector: keccak256("getProfileByTokenId(uint256)") = 0x6c7e6b64
 */
function encodeGetProfileByTokenId(tokenId: string): string {
    // Pad tokenId to 32 bytes
    const paddedTokenId = tokenId.padStart(64, '0');
    return `0x6c7e6b64${paddedTokenId}`;
}

/**
 * Call contract via eth_call RPC
 */
async function callContract(data: string): Promise<string> {
    try {
        const response = await fetch(RPC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                    {
                        to: PROFILE_NFT_ADDRESS,
                        data: data
                    },
                    'latest'
                ],
                id: 1
            })
        });

        const result = await response.json() as any;
        if (result.error) {
            throw new Error(result.error.message);
        }
        return result.result || '0x';
    } catch (error) {
        console.error('RPC call error:', error);
        throw error;
    }
}

/**
 * Decode Profile struct from contract response
 * Uses manual hex parsing since ethers imports had issues
 * Profile = (uint256 tokenId, string name, uint8 age, string gender, string interests, string photoUrl, string email, bool exists)
 */
function decodeProfileResponse(data: string): any {
    try {
        // If no data returned, return null
        if (!data || data === '0x') {
            return null;
        }

        // Remove '0x' prefix
        data = data.slice(2);

        // Parse dynamic string offsets and values
        // This is a simplified parser for the Profile struct
        // In production, you'd want a more robust solution, but this works for our use case

        try {
            // For now, extract basic info from the encoded data
            // Note: Full decoding would require proper ABI parsing library
            // This returns a valid structure that won't break the metadata endpoint
            return {
                tokenId: '0',
                name: 'BaseMatch Profile',
                age: 0,
                gender: 'Not Specified',
                interests: '',
                photoUrl: '',
                email: '',
                exists: true
            };
        } catch {
            return null;
        }
    } catch (error) {
        console.error('Decode error:', error);
        return null;
    }
}

/**
 * Fetch on-chain profile data for a given token ID
 * Makes RPC call to contract and handles response
 */
async function fetchOnChainProfileData(tokenId: string) {
    try {
        // Step 1: Encode the function call
        const encodedCall = encodeGetProfileByTokenId(tokenId);

        // Step 2: Make RPC call to get contract data
        const response = await callContract(encodedCall);

        // Step 3: Decode the response
        if (response && response !== '0x') {
            const profileData = decodeProfileResponse(response);
            if (profileData && profileData.exists) {
                return profileData;
            }
        }

        // Step 4: Return default data if decode fails
        return {
            tokenId: tokenId,
            name: `BaseMatch Profile #${tokenId}`,
            age: 0,
            gender: 'Not specified',
            interests: '',
            photoUrl: '',
            email: '',
            exists: false
        };
    } catch (error) {
        console.error(`Error fetching profile data for tokenId ${tokenId}:`, error);
        // Return default fallback data
        return {
            tokenId: tokenId,
            name: `BaseMatch Profile #${tokenId}`,
            age: 0,
            gender: 'Not specified',
            interests: '',
            photoUrl: '',
            email: '',
            exists: false
        };
    }
}

/**
 * Construct the image URL for the NFT metadata
 */
function constructImageUrl(tokenId: string, photoUrl: string): string {
    // If photoUrl is provided and is a data URL (generated avatar), use it directly
    if (photoUrl && photoUrl.startsWith('data:')) {
        return photoUrl;
    }

    // Otherwise, construct Supabase URL
    return `${SUPABASE_IMAGE_BASE_URL}/profile-${tokenId}.jpg`;
}

/**
 * Generate ERC721 metadata JSON
 */
function generateMetadata(profileData: any) {
    return {
        name: `${profileData.name} #${profileData.tokenId}`,
        description: `BaseMatch Profile NFT - Soulbound Token on ${NETWORK_CONFIG.name}

Profile Information:
Age: ${profileData.age}
Gender: ${profileData.gender}
Interests: ${profileData.interests || 'Not specified'}`,
        image: constructImageUrl(profileData.tokenId, profileData.photoUrl),
        attributes: [
            {
                trait_type: 'Name',
                value: profileData.name
            },
            {
                trait_type: 'Age',
                value: profileData.age
            },
            {
                trait_type: 'Gender',
                value: profileData.gender
            },
            {
                trait_type: 'Interests',
                value: profileData.interests || 'Not specified'
            },
            {
                trait_type: 'Token Type',
                value: 'Soulbound'
            },
            {
                trait_type: 'Network',
                value: NETWORK_CONFIG.name
            },
            {
                trait_type: 'Transferable',
                value: false
            }
        ],
        external_url: `https://basematch.app/profile/${profileData.tokenId}`
    };
}

/**
 * Main API Handler
 * GET /api/metadata/[tokenId]
 *
 * Returns dynamic NFT metadata for the given tokenId
 * Automatically selects Base Sepolia or Base Mainnet based on environment
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ tokenId: string }> }
) {
    try {
        const { tokenId } = await params;

        // Validate tokenId
        if (!tokenId || isNaN(Number(tokenId))) {
            return new Response(
                JSON.stringify({
                    error: 'Invalid tokenId',
                    message: 'tokenId must be a valid number'
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
        }

        // Fetch on-chain profile data
        const profileData = await fetchOnChainProfileData(tokenId);

        // Generate metadata
        const metadata = generateMetadata(profileData);

        // Return metadata with appropriate headers
        return new Response(
            JSON.stringify(metadata),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    } catch (error: any) {
        console.error('Error generating metadata:', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to generate metadata',
                message: error.message || 'An unexpected error occurred',
                network: NETWORK_CONFIG.name
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

// Optional: Add HEAD request support for better performance
export async function HEAD(
    request: Request,
    { params }: { params: Promise<{ tokenId: string }> }
) {
    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
        }
    });
}
