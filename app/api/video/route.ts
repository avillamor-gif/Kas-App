import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("video") as File | null;
  if (!file) return NextResponse.json({ error: "No video file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const videoDir = path.join(process.cwd(), "public", "video");
  await mkdir(videoDir, { recursive: true });
  const filename = `${user.id}-${Date.now()}.webm`;
  await writeFile(path.join(videoDir, filename), buffer);

  const url = `/video/${filename}`;

  const { data, error } = await supabase.from("AudioClip").insert({
    userId: user.id,
    url,
    duration: null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, url });
}
