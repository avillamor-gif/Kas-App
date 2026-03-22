"use client";

// /install — PWA install landing page
// Opened when a member scans their unique QR code.
// After auth/callback redirects here, we:
//   1. Detect if already installed as PWA → skip straight to /tracker
//   2. Show OS-specific "Add to Home Screen" instructions
//   3. Once installed (display-mode: standalone), auto-redirect to /tracker

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Smartphone, Share, MoreVertical, Plus, CheckCircle } from "lucide-react";

type OS = "ios" | "android" | "desktop" | "unknown";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Win|Mac|Linux/.test(ua)) return "desktop";
  return "unknown";
}

export default function InstallPage() {
  const router = useRouter();
  const [os, setOs] = useState<OS>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    setOs(detectOS());

    // Already running as PWA — go straight to tracker
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (standalone) {
      router.replace("/tracker");
      return;
    }

    // Listen for the native install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setTimeout(() => router.replace("/tracker"), 1500);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [router]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setTimeout(() => router.replace("/tracker"), 1500);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-6">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <p className="text-white text-lg font-bold">App installed!</p>
        <p className="text-gray-400 text-sm text-center">Opening KAS Tracker…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* App icon */}
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
          <Smartphone className="w-10 h-10 text-white" />
        </div>

        <div className="text-center">
          <h1 className="text-white text-2xl font-bold">KAS Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">Family Safety App</p>
        </div>

        {/* Android / Chrome — native install button */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-4 rounded-2xl text-base transition shadow-lg shadow-blue-900"
          >
            <Download className="w-5 h-5" />
            Install App
          </button>
        )}

        {/* iOS — manual instructions */}
        {os === "ios" && !deferredPrompt && (
          <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-white font-semibold text-center text-sm">Add to Home Screen</p>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-gray-300 text-sm">Tap the <strong className="text-white">Share</strong> button at the bottom of Safari</p>
                  <Share className="w-5 h-5 text-blue-400 mt-1" />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-gray-300 text-sm">Scroll down and tap</p>
                  <div className="mt-1 flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 w-fit">
                    <Plus className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-200 text-sm font-medium">Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">3</div>
                <p className="text-gray-300 text-sm">Tap <strong className="text-white">Add</strong> in the top-right corner</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">4</div>
                <p className="text-gray-300 text-sm">Open <strong className="text-white">KAS Tracker</strong> from your home screen and press <strong className="text-white">START</strong></p>
              </div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-3 py-2">
              <p className="text-yellow-300 text-xs font-semibold mb-0.5">⚠️ Must use Safari</p>
              <p className="text-yellow-200/70 text-xs">Chrome on iPhone cannot install apps. Open this page in Safari.</p>
            </div>
          </div>
        )}

        {/* Android — manual fallback if no native prompt */}
        {os === "android" && !deferredPrompt && (
          <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-white font-semibold text-center text-sm">Add to Home Screen</p>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-gray-300 text-sm">Tap the menu icon in Chrome</p>
                  <MoreVertical className="w-5 h-5 text-gray-400 mt-1" />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-gray-300 text-sm">Tap</p>
                  <div className="mt-1 flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 w-fit">
                    <Plus className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-200 text-sm font-medium">Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">3</div>
                <p className="text-gray-300 text-sm">Open <strong className="text-white">KAS Tracker</strong> from your home screen and press <strong className="text-white">START</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* Desktop fallback */}
        {(os === "desktop" || os === "unknown") && !deferredPrompt && (
          <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-sm">Open this link on your phone to install the KAS Tracker app.</p>
          </div>
        )}

        {/* Skip link */}
        <button
          onClick={() => router.push("/tracker")}
          className="text-gray-600 text-xs underline underline-offset-2 hover:text-gray-400 transition"
        >
          Skip — open in browser instead
        </button>

      </div>
    </div>
  );
}
