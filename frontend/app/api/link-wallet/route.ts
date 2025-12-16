import { NextResponse } from "next/server";
import { supabaseService } from '@/lib/supabase.server';

export async function POST(req: Request) {
  try {

    // Expect 'id' (UUID), wallet address, and profile details from the client
    const { id, wallet_address, name, age, gender, interests } = await req.json();

    // Validate input
    if (!id || !wallet_address) {
      return NextResponse.json(
        { error: "Missing profile ID (id) or wallet address" },
        { status: 400 }
      );
    }

    // Normalize wallet address to lowercase
    const normalizedWallet = wallet_address.toLowerCase();

    const { data: profile, error } = await supabaseService
      .from("profiles")
      .update({
        wallet_address: normalizedWallet,
        wallet_verified: true, // Setting the verified flag as requested
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
