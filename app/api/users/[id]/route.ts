import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.role !== "admin" && user.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, color } = await req.json();
  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email && user.role === "admin") data.email = email;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (role && user.role === "admin") data.role = role;
  if (color && user.role === "admin") data.color = color;

  const { data: updated, error } = await supabase.from("User").update(data).eq("id", id)
    .select("id, name, email, role, color").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const { error } = await supabase.from("User").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
