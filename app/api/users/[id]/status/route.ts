import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// GET /api/users/[id]/status
// Polled by the tracker page to check sleepLocked + trackingEnabled
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Members can only check their own status; admins can check anyone
  if (user.role !== "admin" && user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("User")
    .select("sleepLocked, trackingEnabled")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sleepLocked: data.sleepLocked ?? false,
    trackingEnabled: data.trackingEnabled ?? true,
  });
}
