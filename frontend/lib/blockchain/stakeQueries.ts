// frontend/lib/blockchain/stakeQueries.ts
// Reusable blockchain query utilities using actual contract functions

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
  totalStaked: bigint;
  meetingTime: bigint;
  user1Staked: boolean;
  user2Staked: boolean;
  processed: boolean;
  createdAt: bigint;
  exists: boolean;
}

export interface ConfirmationData {
  hasConfirmed: boolean;
  iShowedUp: boolean;
  theyShowedUp: boolean;
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
      functionName: 'getStake',
      args: [stakeIdBigInt]
    }) as any;

    // Parse the stake data tuple
    const result: StakeBlockchainData = {
      user1: stakeData[0],
      user2: stakeData[1],
      user1Amount: stakeData[2],
      user2Amount: stakeData[3],
      totalStaked: stakeData[4],
      meetingTime: stakeData[5],
      user1Staked: stakeData[6],
      user2Staked: stakeData[7],
      processed: stakeData[8],
      createdAt: stakeData[9],
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
 * Get confirmation status for a specific user and stake
 */
export async function getConfirmationFromBlockchain(
  stakeId: string | bigint,
  userAddress: string
): Promise<ConfirmationData | null> {
  try {
    const stakeIdBigInt = typeof stakeId === 'string' ? BigInt(stakeId) : stakeId;
    
    console.log(`🔗 Querying confirmation for stake ${stakeIdBigInt}, user ${userAddress}...`);
    
    const confirmationData = await publicClient.readContract({
      address: CONTRACTS.STAKING as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'getConfirmation',
      args: [stakeIdBigInt, userAddress as `0x${string}`]
    }) as any;

    const result: ConfirmationData = {
      hasConfirmed: confirmationData[0],
      iShowedUp: confirmationData[1],
      theyShowedUp: confirmationData[2]
    };

    console.log(`✅ Confirmation data for stake ${stakeIdBigInt}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ Failed to query confirmation for stake ${stakeId}:`, error);
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
  const confirmationData = await getConfirmationFromBlockchain(stakeId, userAddress);
  
  if (!confirmationData) {
    return null; // Blockchain query failed
  }

  return confirmationData.hasConfirmed;
}

/**
 * Check if both users have confirmed a stake
 */
export async function haveBothUsersConfirmed(
  stakeId: string | bigint,
  user1Address: string,
  user2Address: string
): Promise<boolean | null> {
  try {
    const [user1Confirmation, user2Confirmation] = await Promise.all([
      getConfirmationFromBlockchain(stakeId, user1Address),
      getConfirmationFromBlockchain(stakeId, user2Address)
    ]);
    
    if (!user1Confirmation || !user2Confirmation) {
      return null; // One or both queries failed
    }

    return user1Confirmation.hasConfirmed && user2Confirmation.hasConfirmed;
  } catch (error) {
    console.error('Failed to check if both users confirmed:', error);
    return null;
  }
}

/**
 * Get the confirmation status for both users
 */
export async function getConfirmationStatus(
  stakeId: string | bigint,
  user1Address: string,
  user2Address: string
): Promise<{
  user1Confirmed: boolean;
  user2Confirmed: boolean;
  bothConfirmed: boolean;
} | null> {
  try {
    const [user1Confirmation, user2Confirmation] = await Promise.all([
      getConfirmationFromBlockchain(stakeId, user1Address),
      getConfirmationFromBlockchain(stakeId, user2Address)
    ]);
    
    if (!user1Confirmation || !user2Confirmation) {
      return null;
    }

    return {
      user1Confirmed: user1Confirmation.hasConfirmed,
      user2Confirmed: user2Confirmation.hasConfirmed,
      bothConfirmed: user1Confirmation.hasConfirmed && user2Confirmation.hasConfirmed
    };
  } catch (error) {
    console.error('Failed to get confirmation status:', error);
    return null;
  }
}


/**
 * Trigger database sync after a confirmation transaction
 * Call this after a user submits a confirmation on the blockchain
 */
export async function syncStakeAfterConfirmation(
  stakeId: string | bigint,
  userAddress: string
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log(`🔄 Triggering sync for stake ${stakeId} after confirmation by ${userAddress}...`);
    
    const response = await fetch('/api/stakes/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: userAddress
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Sync completed:`, result);
      return { success: true, message: result.message };
    } else {
      console.error(`❌ Sync failed:`, result);
      return { success: false, message: result.error };
    }
  } catch (error) {
    console.error('❌ Failed to trigger sync:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}


