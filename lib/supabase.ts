import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Admin client (bypasses RLS) — only use in API routes ────────────────────
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ─── Server client (respects RLS, reads cookies) — for server components ─────
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

// Types matching our schema
export type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  color: string;
  isTracking: boolean;
  sleepLocked: boolean;
  trackingEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

export type DbLocation = {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  createdAt: string;
};

export type DbAudioClip = {
  id: string;
  userId: string;
  url: string;
  duration: number | null;
  createdAt: string;
};

export type DbVideoClip = {
  id: string;
  userId: string;
  url: string;
  duration: number | null;
  createdAt: string;
};
