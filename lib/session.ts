import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
};

const adminClient = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Reads the Supabase session from either:
 * 1. Authorization: Bearer <token> header (Capacitor/mobile app using localStorage)
 * 2. Cookies (web browser login via /api/auth/login)
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  let userId: string | null = null;

  // Method 1: Bearer token in Authorization header (Capacitor app)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await adminClient.auth.getUser(token);
    userId = user?.id ?? null;
  }

  // Method 2: Cookies (web login)
  if (!userId) {
    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  const { data } = await adminClient
    .from("User")
    .select("id, name, email, role, color")
    .eq("id", userId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    color: data.color,
  };
}
