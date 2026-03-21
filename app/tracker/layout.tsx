import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tracker | KAS Family Tracker",
};

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
