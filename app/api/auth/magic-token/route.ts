import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// POST /api/auth/magic-token
// Uses Supabase admin.generateLink to create a one-time magic login URL for the
// currently logged-in user. No extra DB columns required.
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Derive the app origin from the incoming request so this works on any domain
  const origin = req.nextUrl.origin;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: session.email,
    options: {
      // auth/callback sets the session then redirects to /install for PWA prompt
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.properties?.action_link) {
    console.error("generateLink error", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  // Wrap through our /api/auth/magic proxy so the QR encodes a short app URL
  const encoded = encodeURIComponent(data.properties.action_link);
  const qrUrl = `${origin}/api/auth/magic?link=${encoded}`;

  return NextResponse.json({ url: qrUrl });
}
