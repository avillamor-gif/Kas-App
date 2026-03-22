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

/**
 * Reads the Supabase session from cookies in an API route request,
 * then looks up role/color from our custom User table.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {}, // read-only in API routes
    },
  });

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const admin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await admin
    .from("User")
    .select("id, name, email, role, color")
    .eq("id", user.id)
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
