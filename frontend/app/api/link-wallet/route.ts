import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  try {
    const { email, wallet_address } = await req.json();

    // Validate input
    if (!email || !wallet_address) {
      return NextResponse.json(
        { error: "Missing email or wallet address" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Update profile row and return the updated row
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ wallet_address })
      .eq("email", email)
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
        { error: "Profile not found for the given email" },
        { status: 404 }
      );
    }

    // Profile updated and includes id, email, wallet_address etc.
    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    console.error("Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
