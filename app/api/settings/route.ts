import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// GET /api/settings
// Get app customization settings
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("Settings")
    .select("*")
    .eq("key", "app_customization")
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = data?.value || {
    appName: "KAS Family Tracker",
    appShortName: "KAS Tracker",
    iconColor: "#FF6B35",
    themeColor: "#FF6B35",
  };

  return NextResponse.json(settings);
}

// PATCH /api/settings
// Update app customization settings (admin only)
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden — admins only" }, { status: 403 });

  const { appName, appShortName, iconColor, themeColor } = await req.json();

  if (!appName || !appShortName) {
    return NextResponse.json({ error: "appName and appShortName required" }, { status: 400 });
  }

  const settings = {
    appName,
    appShortName,
    iconColor: iconColor || "#FF6B35",
    themeColor: themeColor || "#FF6B35",
  };

  // Try to update first; if not exists, insert
  const { error: updateError } = await supabase
    .from("Settings")
    .update({ value: settings, updated_at: new Date().toISOString() })
    .eq("key", "app_customization");

  if (updateError) {
    const { error: insertError } = await supabase.from("Settings").insert({
      key: "app_customization",
      value: settings,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json(settings);
}
