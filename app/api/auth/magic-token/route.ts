import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// POST /api/auth/magic-token
// Uses Supabase admin.generateLink to create a one-time magic login URL for the
// currently logged-in user. No extra DB columns required.
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: session.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kas-app.vercel.app"}/auth/callback`,
    },
  });

  if (error || !data?.properties?.action_link) {
    console.error("generateLink error", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  // Wrap the Supabase action_link through our own /api/auth/magic endpoint
  // so the QR encodes a short kas-app URL instead of a raw Supabase URL.
  const token = encodeURIComponent(data.properties.action_link);
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kas-app.vercel.app"}/api/auth/magic?link=${token}`;

  return NextResponse.json({ url: qrUrl });
}
