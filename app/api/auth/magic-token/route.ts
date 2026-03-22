import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

// POST /api/auth/magic-token
// Generates (or refreshes) a one-time magic login token for the logged-in user.
// Tokens expire after 24 hours and are single-use.
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Generate a 32-byte hex token
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  const { error } = await supabase
    .from("User")
    .update({ magicToken: token, magicTokenExpiry: expiry })
    .eq("id", session.id);

  if (error) {
    console.error("magic-token update error", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
