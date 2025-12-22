// frontend/app/api/date/record/route.ts
// FIXED: Blockchain calls are now CRITICAL - if they fail, the whole operation fails

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
  },
  {
    type: "function",
    name: "getReputation",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalDates", type: "uint256" },
      { name: "noShows", type: "uint256" },
      { name: "totalRating", type: "uint256" },
      { name: "ratingCount", type: "uint256" }
    ]
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
    throw new Error('❌ ADMIN_PRIVATE_KEY not set - blockchain calls cannot be made');
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
      userAddress,
      stakeId,
      user1Address,
      user2Address,
      meetingTime,
      bothShowedUp,
      user1ShowedUp,
      user2ShowedUp
    } = body;

    console.log('📥 Date record request:', { stakeId, user1ShowedUp, user2ShowedUp });

    const supabase = getSupabaseAdmin();
    
    // ✅ Get blockchain clients - this will THROW if ADMIN_PRIVATE_KEY is missing
    let publicClient, walletClient;
    try {
      const clients = getBlockchainClients();
      publicClient = clients.publicClient;
      walletClient = clients.walletClient;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain clients:', error);
      return NextResponse.json({ 
        error: 'Blockchain configuration error - cannot record dates',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`;
    
    if (!reputationAddress) {
      console.error('❌ NEXT_PUBLIC_REPUTATION_ADDRESS not set');
      return NextResponse.json({ 
        error: 'Reputation contract address not configured' 
      }, { status: 500 });
    }

    console.log('🔗 Reputation contract:', reputationAddress);
    
    const today = new Date().toISOString().split('T')[0];

    // NEW FORMAT: Record for both users when full stake info is provided
    if (stakeId && user1Address && user2Address) {
      console.log(`📝 Recording date for both users from stake ${stakeId}`);
      
      const dateRecordsToInsert = [];
      const blockchainCalls: Array<{ address: string; showedUp: boolean }> = [];

      // === USER 1 ===
      console.log(`👤 User1: ${user1Address}, showed up: ${user1ShowedUp}`);
      
      if (user1ShowedUp) {
        const { data: existingUser1Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user1Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser1Date) {
          dateRecordsToInsert.push({
            user_address: user1Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });
          blockchainCalls.push({ address: user1Address, showedUp: true });
          console.log('✅ User1 will be recorded');
        } else {
          console.log('ℹ️ User1 already recorded today');
        }
      } else {
        blockchainCalls.push({ address: user1Address, showedUp: false });
        console.log('❌ User1 no-show will be recorded');
      }

      // === USER 2 ===
      console.log(`👤 User2: ${user2Address}, showed up: ${user2ShowedUp}`);
      
      if (user2ShowedUp) {
        const { data: existingUser2Date } = await supabase
          .from('date_history')
          .select('id')
          .eq('user_address', user2Address.toLowerCase())
          .gte('date_occurred_at', `${today}T00:00:00Z`)
          .lte('date_occurred_at', `${today}T23:59:59Z`)
          .maybeSingle();

        if (!existingUser2Date) {
          dateRecordsToInsert.push({
            user_address: user2Address.toLowerCase(),
            date_occurred_at: new Date(meetingTime * 1000).toISOString(),
            stake_id: stakeId,
            both_showed_up: bothShowedUp
          });
          blockchainCalls.push({ address: user2Address, showedUp: true });
          console.log('✅ User2 will be recorded');
        } else {
          console.log('ℹ️ User2 already recorded today');
        }
      } else {
        blockchainCalls.push({ address: user2Address, showedUp: false });
        console.log('❌ User2 no-show will be recorded');
      }

      // === STEP 1: Write to Blockchain FIRST (source of truth) ===
      console.log(`\n⛓️  Making ${blockchainCalls.length} blockchain call(s)...`);
      
      const blockchainResults = [];
      let hadBlockchainFailure = false;

      for (const call of blockchainCalls) {
        try {
          console.log(`\n🔄 ${call.showedUp ? 'recordDate' : 'recordNoShow'} for ${call.address}...`);
          
          // Check reputation BEFORE
          const repBefore = await publicClient.readContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'getReputation',
            args: [call.address as `0x${string}`]
          });
          console.log(`📊 BEFORE: totalDates=${repBefore[0]}, noShows=${repBefore[1]}`);
          
          // Make the blockchain call
          const hash = await walletClient.writeContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: call.showedUp ? 'recordDate' : 'recordNoShow',
            args: [call.address as `0x${string}`]
          });

          console.log(`⏳ Tx sent: ${hash}, waiting for confirmation...`);
          const receipt = await publicClient.waitForTransactionReceipt({ 
            hash,
            timeout: 60_000 // 60 second timeout
          });
          console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
          
          // Check reputation AFTER
          const repAfter = await publicClient.readContract({
            address: reputationAddress,
            abi: REPUTATION_ABI,
            functionName: 'getReputation',
            args: [call.address as `0x${string}`]
          });
          console.log(`📊 AFTER: totalDates=${repAfter[0]}, noShows=${repAfter[1]}`);
          
          // Verify the change happened
          if (call.showedUp && repAfter[0] <= repBefore[0]) {
            console.error(`⚠️ WARNING: totalDates did not increase! Before: ${repBefore[0]}, After: ${repAfter[0]}`);
          }
          if (!call.showedUp && repAfter[1] <= repBefore[1]) {
            console.error(`⚠️ WARNING: noShows did not increase! Before: ${repBefore[1]}, After: ${repAfter[1]}`);
          }
          
          blockchainResults.push({
            address: call.address,
            type: call.showedUp ? 'date' : 'no-show',
            status: 'success',
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
            before: { totalDates: Number(repBefore[0]), noShows: Number(repBefore[1]) },
            after: { totalDates: Number(repAfter[0]), noShows: Number(repAfter[1]) }
          });
        } catch (error) {
          console.error(`❌ BLOCKCHAIN CALL FAILED for ${call.address}:`, error);
          hadBlockchainFailure = true;
          blockchainResults.push({
            address: call.address,
            type: call.showedUp ? 'date' : 'no-show',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // ⚠️ If any blockchain call failed, STOP and return error
      if (hadBlockchainFailure) {
        console.error('❌ Blockchain calls failed - aborting database write');
        return NextResponse.json({ 
          success: false,
          error: 'Failed to record on blockchain',
          blockchain: {
            callsAttempted: blockchainCalls.length,
            results: blockchainResults
          }
        }, { status: 500 });
      }

      // === STEP 2: Write to Database (only if blockchain succeeded) ===
      if (dateRecordsToInsert.length > 0) {
        console.log(`\n💾 Writing ${dateRecordsToInsert.length} record(s) to date_history...`);
        const { error } = await supabase
          .from('date_history')
          .insert(dateRecordsToInsert);

        if (error) {
          console.error('❌ Database insert failed:', error);
          return NextResponse.json({ 
            error: 'Failed to record dates in database (blockchain already updated)',
            blockchain: { results: blockchainResults }
          }, { status: 500 });
        }

        console.log(`✅ Successfully recorded ${dateRecordsToInsert.length} date(s) in database`);
      }

      const successfulBlockchainCalls = blockchainResults.filter(r => r.status === 'success').length;
      console.log(`\n🎉 SUCCESS: ${successfulBlockchainCalls}/${blockchainCalls.length} blockchain calls succeeded`);

      return NextResponse.json({ 
        success: true, 
        message: `Recorded - DB: ${dateRecordsToInsert.length}, Blockchain: ${successfulBlockchainCalls}`,
        database: {
          recordsCreated: dateRecordsToInsert.length
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

      // ✅ Blockchain FIRST
      try {
        console.log('⛓️  Recording on blockchain...');
        const hash = await walletClient.writeContract({
          address: reputationAddress,
          abi: REPUTATION_ABI,
          functionName: 'recordDate',
          args: [userAddress as `0x${string}`]
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Recorded on blockchain: ${hash}`);
      } catch (error) {
        console.error('❌ Blockchain call failed:', error);
        return NextResponse.json({ 
          error: 'Failed to record on blockchain',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }

      // Database after blockchain succeeds
      const { error } = await supabase
        .from('date_history')
        .insert({
          user_address: userAddress.toLowerCase(),
          date_occurred_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Database insert failed:', error);
        return NextResponse.json({ 
          error: 'Failed to record date in database (blockchain already updated)' 
        }, { status: 500 });
      }

      console.log(`✅ Recorded in database for ${userAddress}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Date recorded successfully' 
      });
    }

    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in POST /api/date/record:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
