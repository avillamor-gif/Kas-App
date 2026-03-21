import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("User")
    .select("id, name, email, role, color, isTracking, lastSeen, createdAt")
    .order("createdAt", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, color } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email, password required" }, { status: 400 });

  const { data: existing } = await supabase.from("User").select("id").eq("email", email).single();
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const { data, error } = await supabase.from("User").insert({
    name, email, password: hashed,
    role: role ?? "member",
    color: color ?? "#3B82F6",
  }).select("id, name, email, role, color, createdAt").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
