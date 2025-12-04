import { NextResponse } from "next/server";
import { supabaseService } from '@/lib/supabase';

export async function POST(req: Request) {
  try {

    // Expect 'id' (UUID) and the new wallet address from the client
    const { id, wallet_address } = await req.json();

    // Validate input
    if (!id || !wallet_address) {
      return NextResponse.json(
        { error: "Missing profile ID (id) or wallet address" },
        { status: 400 }
      );
    }

    // Update the profile row with the wallet information and verification status
    // Filtering by 'id' is the most efficient method (Primary Key lookup).
    const { data: profile, error } = await supabaseService
      .from("profiles")
      .update({
        wallet_address: wallet_address,
        wallet_verified: true // Setting the verified flag as requested
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

    // Success response
    return NextResponse.json({ success: true, profile });

  } catch (err: any) {
    console.error("Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
