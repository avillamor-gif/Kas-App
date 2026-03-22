import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// POST /api/auth/magic-token/[id]
// Admin-only: generate a one-time magic login URL for a specific member.
// The QR on the Manage Members page uses this so each member's QR is unique.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Look up the target member's email
  const { data: member, error: memberErr } = await supabase
    .from("User")
    .select("email")
    .eq("id", id)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: member.email,
    options: {
      // Redirect to /install so the browser prompts "Add to Home Screen" before /tracker
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.properties?.action_link) {
    console.error("generateLink error", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  // Route through our proxy so the QR URL is short and on our domain
  const encoded = encodeURIComponent(data.properties.action_link);
  const qrUrl = `${origin}/api/auth/magic?link=${encoded}`;

  return NextResponse.json({ url: qrUrl });
}
