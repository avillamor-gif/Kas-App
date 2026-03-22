import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  if (!file) return NextResponse.json({ error: "No video file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${user.id}/${Date.now()}.webm`;

  const { error: uploadError } = await supabase.storage
    .from("video-clips")
    .upload(filename, buffer, { contentType: "video/webm", upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("video-clips")
    .getPublicUrl(filename);

  const { data, error } = await supabase.from("VideoClip").insert({
    userId: user.id,
    url: publicUrl,
    duration: null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, url: publicUrl });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  let query = supabase
    .from("VideoClip")
    .select("id, url, createdAt, userId, User(name, color)")
    .order("createdAt", { ascending: false })
    .limit(50);

  if (userId) query = query.eq("userId", userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mapped = (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    user: c["User"],
  }));

  return NextResponse.json(mapped);
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Fetch the clip to get its storage path
  const { data: clip, error: fetchErr } = await supabase
    .from("VideoClip")
    .select("url, userId")
    .eq("id", id)
    .single();

  if (fetchErr || !clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Extract path from public URL: .../video-clips/<userId>/<timestamp>.webm
  const urlObj = new URL(clip.url);
  const storagePath = urlObj.pathname.split("/video-clips/")[1];
  if (storagePath) {
    await supabase.storage.from("video-clips").remove([storagePath]);
  }

  const { error } = await supabase.from("VideoClip").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
