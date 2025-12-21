// frontend/app/api/date/record/route.ts
// FIXED: Records date for BOTH users in Supabase AND on blockchain Reputation contract

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export const runtime = 'nodejs';

const REPUTATION_ABI = [
  {
    type: "function",
    name: "recordDate",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "recordNoShow",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: []
  }
] as const;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getBlockchainClients() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  });

  const privateKeyStr = process.env.ADMIN_PRIVATE_KEY;
  if (!privateKeyStr) {
    return { publicClient, walletClient: null };
  }

  const privateKeyWithPrefix = privateKeyStr.startsWith('0x') ? privateKeyStr : `0x${privateKeyStr}`;
  const adminAccount = privateKeyToAccount(privateKeyWithPrefix as `0x${string}`);
  
  const walletClient = createWalletClient({
    account: adminAccount,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  });

  return { publicClient, walletClient };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      userAddress,       // Old format
      stakeId,           // New format
      user1Address,
      user2Address,
      meetingTime,
      bothShowedUp,
      user1ShowedUp,
      user2ShowedUp
    } = body;

    const supabase = getSupabaseAdmin();
    const { publicClient, walletClient } = getBlockchainClients();
    const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`;
    const today = new Date().toISOString().split('T')[0];

    // NEW FORMAT: Record for both users when full stake info is provided
    if (stakeId && user1Address && user2Address) {
      console.log(`📝 Recording date for both users from stake ${stakeId}`);
      
      const recordsToInsert = [];
      const blockchainCalls = [];

      // === USER 1 ===
      if (user1ShowedUp) {
        // Check if already recorded in DB
        const { data: existingUser1Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user1Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser1Date) {
          recordsToInsert.push({
            user_address: user1Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });

          // Add blockchain call for user1
          if (walletClient && reputationAddress) {
            blockchainCalls.push({
              address: user1Address,
              showedUp: true
            });
          }
        }
      } else {
        // User1 didn't show - record no-show on blockchain
        if (walletClient && reputationAddress) {
          blockchainCalls.push({
            address: user1Address,
            showedUp: false
          });
        }
      }

      // === USER 2 ===
      if (user2ShowedUp) {
        const { data: existingUser2Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user2Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser2Date) {
          recordsToInsert.push({
            user_address: user2Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });

          if (walletClient && reputationAddress) {
            blockchainCalls.push({
              address: user2Address,
              showedUp: true
            });
          }
        }
      } else {
        // User2 didn't show - record no-show on blockchain
        if (walletClient && reputationAddress) {
          blockchainCalls.push({
            address: user2Address,
            showedUp: false
          });
        }
      }

      // === STEP 1: Write to Supabase ===
      if (recordsToInsert.length > 0) {
        const { error } = await supabase
          .from('date_history')
          .insert(recordsToInsert);

        if (error) {
          console.error('Error recording dates in DB:', error);
          return NextResponse.json({ error: 'Failed to record dates in database' }, { status: 500 });
        }

        console.log(`✅ Recorded ${recordsToInsert.length} date(s) in Supabase`);
      }

      // === STEP 2: Write to Blockchain ===
      const blockchainResults = [];
      for (const call of blockchainCalls) {
        try {
          console.log(`⛓️  Recording ${call.showedUp ? 'date' : 'no-show'} on blockchain for ${call.address}`);
          
          const hash = await walletClient!.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: call.showedUp ? 'recordDate' : 'recordNoShow',
            args: [call.address as `0x${string}`]
          });

          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log(`✅ Blockchain tx confirmed: ${hash}`);
          
          blockchainResults.push({
            address: call.address,
            type: call.showedUp ? 'date' : 'no-show',
            status: 'success',
            txHash: hash,
            blockNumber: receipt.blockNumber.toString()
          });
        } catch (error) {
          console.error(`❌ Blockchain call failed for ${call.address}:`, error);
          blockchainResults.push({
            address: call.address,
            type: call.showedUp ? 'date' : 'no-show',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successfulBlockchainCalls = blockchainResults.filter(r => r.status === 'success').length;
      console.log(`🎯 Blockchain: ${successfulBlockchainCalls}/${blockchainCalls.length} calls successful`);

      return NextResponse.json({ 
        success: true, 
        message: `Recorded dates - DB: ${recordsToInsert.length}, Blockchain: ${successfulBlockchainCalls}`,
        database: {
          recordsCreated: recordsToInsert.length
        },
        blockchain: {
          callsAttempted: blockchainCalls.length,
          callsSuccessful: successfulBlockchainCalls,
          results: blockchainResults
        }
      });
    }

    // OLD FORMAT: Single user address (backward compatibility)
    if (userAddress) {
      console.log(`📝 Recording date for single user (old format): ${userAddress}`);
      
      const { data: existingDate } = await supabase
        .from('date_history')
        .select('id')
        .eq('user_address', userAddress.toLowerCase())
        .gte('date_occurred_at', `${today}T00:00:00Z`)
        .lte('date_occurred_at', `${today}T23:59:59Z`)
        .maybeSingle();

      if (existingDate) {
        return NextResponse.json({ 
          success: true, 
          message: 'Date already recorded for today' 
        });
      }

      // Record in DB
      const { error } = await supabase
        .from('date_history')
        .insert({
          user_address: userAddress.toLowerCase(),
          date_occurred_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error recording date:', error);
        return NextResponse.json({ error: 'Failed to record date' }, { status: 500 });
      }

      console.log(`✅ Recorded date in Supabase for ${userAddress}`);

      // Also record on blockchain
      if (walletClient && reputationAddress) {
        try {
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'recordDate',
            args: [userAddress as `0x${string}`]
          });

          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`✅ Recorded date on blockchain for ${userAddress}`);
        } catch (error) {
          console.error('⚠️ Failed to record on blockchain (non-critical):', error);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Date recorded successfully' 
      });
    }

    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in POST /api/date/record:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
