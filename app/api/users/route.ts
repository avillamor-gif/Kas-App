import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("User")
    .select("id, name, email, role, color, isTracking, lastSeen, createdAt")
    .order("createdAt", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, color } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email, password required" }, { status: 400 });

  // 1. Create the Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const authUserId = authData.user.id;

  // 2. Insert into our custom User table using the same id
  const { data, error } = await supabase.from("User").insert({
    id: authUserId,
    name, email,
    password: "", // not used — Supabase Auth handles auth
    role: role ?? "member",
    color: color ?? "#3B82F6",
  }).select("id, name, email, role, color, createdAt").single();

  if (error) {
    // Roll back the auth user if the DB insert fails
    await supabase.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
