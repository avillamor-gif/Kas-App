import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "admin") {
    redirect("/dashboard");
  } else {
    redirect("/tracker");
  }
}
