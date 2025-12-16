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

        const addr1 = userAddress.toLowerCase();
        const addr2 = matchedUserAddress.toLowerCase();

        console.log('Removing match from database:', { from: addr1, to: addr2 });

        // Delete both interest directions to break the match
        // Delete interest from user to matched user
        const { error: error1, count: count1 } = await supabase
            .from("interests")
            .delete({ count: 'exact' })
            .eq("from_address", addr1)
            .eq("to_address", addr2);

        console.log(`Deleted ${count1} interest(s) from ${addr1} to ${addr2}`, error1);

        // Delete interest from matched user to user
        const { error: error2, count: count2 } = await supabase
            .from("interests")
            .delete({ count: 'exact' })
            .eq("from_address", addr2)
            .eq("to_address", addr1);

        console.log(`Deleted ${count2} interest(s) from ${addr2} to ${addr1}`, error2);

        const error = error1 || error2;

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json(
                { error: "Failed to remove match from database", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Match removed from database. Please call blockchain removeMatch() from frontend.",
                userAddress: addr1,
                matchedUserAddress: addr2,
                deleted: {
                    direction1: count1,
                    direction2: count2,
                    total: (count1 || 0) + (count2 || 0)
                },
                blockchainRemovalRequired: true
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
