import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// POST /api/auth/magic-token
// Uses Supabase admin.generateLink to create a one-time magic login URL for the
// currently logged-in user. No extra DB columns required.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    console.log("🔑 Session check:", session ? `✅ Found user ${session.email}` : "❌ No session");
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - no session found" }, { status: 401 });
    }

    if (!session.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Derive the app origin from the incoming request so this works on any domain
    const origin = req.nextUrl.origin;
    console.log("🔗 Generating magic link for:", session.email, "origin:", origin);

    // Check if service role key exists
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
      return NextResponse.json({ error: "Server not configured for magic links" }, { status: 500 });
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: session.email,
      options: {
        // auth/callback sets the session then redirects to /tracker for GPS tracking
        redirectTo: `${origin}/auth/callback`,
      },
    });

    console.log("📊 generateLink response:", {
      hasError: !!error,
      hasData: !!data,
      errorMsg: error?.message,
      dataKeys: data ? Object.keys(data) : null,
    });

    if (error) {
      console.error("❌ generateLink error:", error);
      return NextResponse.json({ 
        error: `Failed to generate link: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    if (!data?.properties?.action_link) {
      console.error("❌ No action_link in response. Data:", JSON.stringify(data, null, 2));
      return NextResponse.json({ 
        error: "Failed to generate link: No action link returned",
        receivedData: data
      }, { status: 500 });
    }

    console.log("✅ Magic link generated successfully");

    // Wrap through our /api/auth/magic proxy so the QR encodes a short app URL
    const encoded = encodeURIComponent(data.properties.action_link);
    const qrUrl = `${origin}/api/auth/magic?link=${encoded}`;

    return NextResponse.json({ url: qrUrl });
  } catch (err) {
    console.error("🔴 Unexpected error in magic-token:", err);
    return NextResponse.json({ 
      error: "Unexpected error",
      message: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
