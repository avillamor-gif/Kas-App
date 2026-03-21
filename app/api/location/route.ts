import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lat, lng, accuracy, speed, heading, altitude } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("Location").insert({
    userId: session.user.id,
    lat, lng,
    accuracy: accuracy ?? null,
    speed: speed ?? null,
    heading: heading ?? null,
    altitude: altitude ?? null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("User").update({
    lastSeen: new Date().toISOString(),
    isTracking: true,
  }).eq("id", session.user.id);

  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, color, isTracking, lastSeen");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await Promise.all(
    (users ?? []).map(async (user) => {
      const { data: locs } = await supabase
        .from("Location")
        .select("lat, lng, accuracy, speed, createdAt")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(1);

      return { ...user, locations: locs ?? [] };
    })
  );

  return NextResponse.json(result);
}
