// frontend/lib/blockchain/stakeQueries.ts
// Reusable blockchain query utilities

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { STAKING_ABI, CONTRACTS } from '@/lib/contracts';

// Create singleton public client
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export interface StakeBlockchainData {
  user1: string;
  user2: string;
  user1Amount: bigint;
  user2Amount: bigint;
  meetingTime: bigint;
  user1Staked: boolean;
  user2Staked: boolean;
  user1Confirmed: boolean;
  user2Confirmed: boolean;
  user1ShowedUp: boolean;
  user2ShowedUp: boolean;
  processed: boolean;
  exists: boolean;
}

/**
 * Query a stake's current state from the blockchain
 * This is the source of truth for stake status
 */
export async function getStakeFromBlockchain(stakeId: string | bigint): Promise<StakeBlockchainData | null> {
  try {
    const stakeIdBigInt = typeof stakeId === 'string' ? BigInt(stakeId) : stakeId;
    
    console.log(`🔗 Querying blockchain for stake ${stakeIdBigInt}...`);
    
    const stakeData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'stakes',
      args: [stakeIdBigInt]
    }) as any;

    // Parse the stake data based on your contract's Stake struct
    // Adjust field names based on your actual contract
    const result: StakeBlockchainData = {
      user1: stakeData.user1 || stakeData[0],
      user2: stakeData.user2 || stakeData[1],
      user1Amount: stakeData.user1Amount || stakeData[2],
      user2Amount: stakeData.user2Amount || stakeData[3],
      meetingTime: stakeData.meetingTime || stakeData[4],
      user1Staked: stakeData.user1Staked || stakeData[5] || false,
      user2Staked: stakeData.user2Staked || stakeData[6] || false,
      user1Confirmed: stakeData.user1Confirmed || stakeData[7] || false,
      user2Confirmed: stakeData.user2Confirmed || stakeData[8] || false,
      user1ShowedUp: stakeData.user1ShowedUp || stakeData[9] || false,
      user2ShowedUp: stakeData.user2ShowedUp || stakeData[10] || false,
      processed: stakeData.processed || stakeData[11] || false,
      exists: true
    };

    console.log(`✅ Blockchain data for stake ${stakeIdBigInt}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ Failed to query blockchain for stake ${stakeId}:`, error);
    return null;
  }
}

/**
 * Check if a specific user has confirmed a stake
 */
export async function hasUserConfirmedStake(
  stakeId: string | bigint,
  userAddress: string
): Promise<boolean | null> {
  const stakeData = await getStakeFromBlockchain(stakeId);
  
  if (!stakeData) {
    return null; // Blockchain query failed
  }

  const isUser1 = stakeData.user1.toLowerCase() === userAddress.toLowerCase();
  return isUser1 ? stakeData.user1Confirmed : stakeData.user2Confirmed;
}

/**
 * Check if both users have confirmed a stake
 */
export async function haveBothUsersConfirmed(stakeId: string | bigint): Promise<boolean | null> {
  const stakeData = await getStakeFromBlockchain(stakeId);
  
  if (!stakeData) {
    return null; // Blockchain query failed
  }

  return stakeData.user1Confirmed && stakeData.user2Confirmed;
}

/**
 * Get the confirmation status for both users
 */
export async function getConfirmationStatus(stakeId: string | bigint): Promise<{
  user1Confirmed: boolean;
  user2Confirmed: boolean;
  bothConfirmed: boolean;
} | null> {
  const stakeData = await getStakeFromBlockchain(stakeId);
  
  if (!stakeData) {
    return null;
  }

  return {
    user1Confirmed: stakeData.user1Confirmed,
    user2Confirmed: stakeData.user2Confirmed,
    bothConfirmed: stakeData.user1Confirmed && stakeData.user2Confirmed
  };
}
