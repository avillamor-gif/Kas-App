import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// GET /api/users/[id]/emergency-lock
// Polled by tracker app to check if power button should be locked
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Members can check their own status; admins can check anyone
  if (user.role !== "admin" && user.id !== id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("User")
    .select("emergencyLocked, trackingActive")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({
    emergencyLocked: data?.emergencyLocked ?? false,
    trackingActive: data?.trackingActive ?? false,
  });
}

// PATCH /api/users/[id]/emergency-lock
// Admin toggles emergency lock — when disabled, tracking also stops
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden — admins only" }, { status: 403 });

  const { id } = await params;
  const { emergencyLocked } = await req.json();

  if (typeof emergencyLocked !== "boolean")
    return NextResponse.json({ error: "emergencyLocked must be boolean" }, { status: 400 });

  // If unlocking, also stop tracking
  const updates = emergencyLocked ? { emergencyLocked } : { emergencyLocked, trackingActive: false };

  const { error } = await supabase
    .from("User")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ emergencyLocked, message: emergencyLocked ? "Power button locked" : "Power button unlocked, tracking stopped" });
}
