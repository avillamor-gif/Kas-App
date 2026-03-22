import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/magic?link=<encoded-supabase-action-link>
// Decodes the Supabase magic link and redirects the phone to it.
// Supabase handles the OTP verification and redirects to /auth/callback.
export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get("link");
  if (!encoded) {
    return NextResponse.redirect(new URL("/login?error=missing_link", req.url));
  }

  const actionLink = decodeURIComponent(encoded);

  // Basic sanity check — must be a Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!actionLink.startsWith(supabaseUrl)) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", req.url));
  }

  return NextResponse.redirect(actionLink);
}
