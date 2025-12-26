// ============================================
// FILE: app/api/profile/link-wallet/route.ts
// ============================================
import { NextResponse } from "next/server";
import { supabaseService } from '@/lib/supabase.server';
import { verifyWalletSignature } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Expect 'id' (UUID), wallet info, and typed signature payload from client
    const {
      id,
      wallet_address,
      signature,
      nonce,
      issuedAt,
      name,
      age,
      gender,
      interests
    } = await req.json();

    // Validate required input
    if (!id || !wallet_address || !signature || !nonce || !issuedAt) {
      return NextResponse.json(
        { error: "Missing required fields: id, wallet_address, signature, nonce, or issuedAt" },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedWallet = wallet_address.toLowerCase();

    // -----------------------------
    // 1. Verify wallet signature
    // -----------------------------
    const isValidSignature = await verifyWalletSignature(signature, {
      address: normalizedWallet,
      nonce,
      issuedAt: Number(issuedAt)
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid wallet signature" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2. Update profile in Supabase
    // -----------------------------
    const { data: profile, error } = await supabaseService
      .from("profiles")
      .update({
        wallet_address: normalizedWallet,
        wallet_verified: true,
        ...(name && { name }),
        ...(age && { age: parseInt(age) }),
        ...(gender && { gender }),
        ...(interests && { interests })
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR (link-wallet):", error);
      return NextResponse.json(
        { error: "Failed to update wallet address", details: error.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for the given ID" },
        { status: 404 }
      );
    }

    // -----------------------------
    // 3. Success response
    // -----------------------------
    return NextResponse.json({ success: true, profile });

  } catch (err: any) {
    console.error("Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
