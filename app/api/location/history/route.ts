import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 1000);

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("Location")
    .select("lat, lng, accuracy, speed, createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).reverse());
}
