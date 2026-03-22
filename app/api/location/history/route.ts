import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const limit = Math.min(Number(searchParams.get("limit") ?? "500"), 2000);
  const since = searchParams.get("since"); // ISO timestamp

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  let query = supabase
    .from("Location")
    .select("lat, lng, accuracy, speed, createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (since) query = query.gte("createdAt", since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).reverse());
}
