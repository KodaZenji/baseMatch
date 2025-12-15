import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    try {
        const { matchedUserAddress } = await request.json();

        if (!matchedUserAddress) {
            return NextResponse.json(
                { error: "matchedUserAddress is required" },
                { status: 400 }
            );
        }

        // Get user from request headers or session
        const userAddress = request.headers.get("x-user-address");
        if (!userAddress) {
            return NextResponse.json(
                { error: "User not authenticated" },
                { status: 401 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: "Supabase configuration missing" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Remove match record from Supabase
        // This is a soft delete - we remove from matches table if it exists
        const { error } = await supabase
            .from("matches")
            .delete()
            .or(
                `and(user1_address.eq.${userAddress},user2_address.eq.${matchedUserAddress}),and(user1_address.eq.${matchedUserAddress},user2_address.eq.${userAddress})`
            );

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json(
                { error: "Failed to remove match from database" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { 
                success: true, 
                message: "Match removed successfully",
                userAddress,
                matchedUserAddress
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Remove match error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
