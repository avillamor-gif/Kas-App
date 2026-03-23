"use client";

import { useEffect } from "react";

// Shared global — same module reference across all pages in the same tab
export type DeferredPrompt = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __kasInstallPrompt: DeferredPrompt | null;
  }
}

export default function InstallPromptCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__kasInstallPrompt = window.__kasInstallPrompt ?? null;

    const handler = (e: Event) => {
      e.preventDefault();
      window.__kasInstallPrompt = e as DeferredPrompt;
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      window.__kasInstallPrompt = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
