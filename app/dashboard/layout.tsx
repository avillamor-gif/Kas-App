import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | KAS Family Tracker",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
