import { createSupabaseServerClient } from "@/lib/supabase";
import { supabase as adminSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await adminSupabase
    .from("User")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/dashboard");
  } else {
    redirect("/tracker");
  }
}
