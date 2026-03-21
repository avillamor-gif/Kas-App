import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isTracking } = await req.json();

  const updateData: Record<string, unknown> = { isTracking: Boolean(isTracking) };
  if (isTracking) updateData.lastSeen = new Date().toISOString();

  const { error } = await supabase.from("User").update(updateData).eq("id", session.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, isTracking: Boolean(isTracking) });
}
