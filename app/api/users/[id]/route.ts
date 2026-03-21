import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin" && sessionUser.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, role, color } = await req.json();
  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email && sessionUser.role === "admin") data.email = email;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (role && sessionUser.role === "admin") data.role = role;
  if (color && sessionUser.role === "admin") data.color = color;

  const { data: updated, error } = await supabase.from("User").update(data).eq("id", id)
    .select("id, name, email, role, color").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionUser = session.user as { id: string; role: string };
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (sessionUser.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const { error } = await supabase.from("User").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
