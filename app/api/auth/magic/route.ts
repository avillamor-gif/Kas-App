import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabase as adminClient } from "@/lib/supabase";

// GET /api/auth/magic?token=xxx
// Validates the magic token, signs in the associated user, sets session cookie, redirects to /tracker.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  // Look up user by token
  const { data: user, error: lookupError } = await adminClient
    .from("User")
    .select("id, magicToken, magicTokenExpiry, email")
    .eq("magicToken", token)
    .single();

  if (lookupError || !user) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  // Check expiry
  if (!user.magicTokenExpiry || new Date(user.magicTokenExpiry) < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired_token", req.url));
  }

  // Invalidate the token immediately (single-use) — do this before signing in
  await adminClient
    .from("User")
    .update({ magicToken: null, magicTokenExpiry: null })
    .eq("id", user.id);

  // Generate a Supabase magic link OTP for the user's email using admin API
  // We can't call signInWithPassword (no password), so we use admin.generateLink
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: {
      redirectTo: `${req.nextUrl.origin}/tracker`,
    },
  });

  if (linkError || !linkData?.properties) {
    console.error("generateLink error", linkError);
    return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
  }

  // The generated link looks like: https://<supabase>/auth/v1/verify?token=...&type=magiclink&redirect_to=...
  // We need to exchange the OTP tokens ourselves so we can set the session cookie server-side.
  // Extract hashed_token + email from linkData.properties and call verifyOtp via the browser-side supabase client
  // Instead, we redirect through Supabase's own confirm URL which sets cookies via the callback.
  // But since we're using @supabase/ssr cookie-based sessions, we need to handle it ourselves.

  // Better approach: use admin.createSession (if available) or use signInWithOtp verify flow.
  // The cleanest SSR-friendly approach: redirect to the Supabase magic link URL directly.
  // Supabase will redirect back to our redirect_to with the session tokens in the URL fragment,
  // which the @supabase/ssr middleware/callback page picks up.

  // Build a response that will redirect to /tracker with session established via the magic link flow
  const supabaseMagicUrl = linkData.properties.action_link;

  return NextResponse.redirect(supabaseMagicUrl);
}
