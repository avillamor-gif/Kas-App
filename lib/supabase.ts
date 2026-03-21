import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side admin client (bypasses RLS) — only used in API routes / server components
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// Types matching our schema
export type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  color: string;
  isTracking: boolean;
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
