"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Share, MoreVertical, Plus, CheckCircle, Download } from "lucide-react";
import type { DeferredPrompt } from "../InstallPromptCapture";

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
  const [phase, setPhase] = useState<
    "checking" | "android-ready" | "android-manual" | "ios" | "done" | "desktop"
  >("checking");

  useEffect(() => {
    const os = detectOS();

    // Already running as installed PWA → go straight to tracker
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      router.replace("/tracker");
      return;
    }

    window.addEventListener("appinstalled", () => {
      setPhase("done");
      setTimeout(() => router.replace("/tracker"), 1500);
    });

    if (os === "ios") {
      setPhase("ios");
      return;
    }

    if (os === "desktop") {
      setPhase("desktop");
      return;
    }

    // Android: check for cached prompt captured by layout
    const checkPrompt = () => {
      if (window.__kasInstallPrompt) {
        setPhase("android-ready");
      } else {
        // Poll briefly — prompt may arrive within a few hundred ms
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.__kasInstallPrompt) {
            clearInterval(interval);
            setPhase("android-ready");
          } else if (attempts >= 20) {
            // 2s elapsed, no prompt — show manual instructions
            clearInterval(interval);
            setPhase("android-manual");
          }
        }, 100);
        return () => clearInterval(interval);
      }
    };

    return checkPrompt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerInstall = () => {
    const prompt = window.__kasInstallPrompt as DeferredPrompt | null;
    if (!prompt) { setPhase("android-manual"); return; }
    prompt.prompt();
    prompt.userChoice.then(({ outcome }) => {
      window.__kasInstallPrompt = null;
      if (outcome === "accepted") {
        setPhase("done");
        setTimeout(() => router.replace("/tracker"), 1500);
      } else {
        setPhase("android-manual");
      }
    });
  };

  /* ── Checking ── */
  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <p className="text-white font-bold text-lg">KAS Tracker</p>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Android: prompt ready ── */
  if (phase === "android-ready") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-xl">KAS Tracker</p>
          <p className="text-green-400 text-sm mt-1">✓ Logged in</p>
        </div>
        <button
          onClick={triggerInstall}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-blue-900 flex items-center gap-3"
        >
          <Download className="w-5 h-5" />
          Install App
        </button>
        <button onClick={() => router.push("/tracker")} className="text-gray-600 text-xs underline underline-offset-2">
          Skip — open in browser
        </button>
      </div>
    );
  }

  /* ── Done ── */
  if (phase === "done") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <p className="text-white text-lg font-bold">App installed!</p>
        <p className="text-gray-400 text-sm">Opening KAS Tracker…</p>
      </div>
    );
  }

  /* ── iOS ── */
  if (phase === "ios") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <p className="text-white text-xl font-bold">KAS Tracker</p>
          <p className="text-green-400 text-sm">✓ Logged in</p>
        </div>
        <div className="bg-gray-900 border-t border-gray-700 rounded-t-3xl px-6 pt-5 pb-12 flex flex-col gap-4 shadow-2xl">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto" />
          <p className="text-white font-bold text-center">Add to Home Screen</p>
          <p className="text-gray-400 text-xs text-center">Install KAS Tracker so it opens like a native app.</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
              <p className="text-gray-300 text-sm">Tap the <strong className="text-white">Share</strong> button <Share className="inline w-3.5 h-3.5 text-blue-400" /> at the bottom of Safari</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
              <p className="text-gray-300 text-sm">Tap <strong className="text-white">Add to Home Screen</strong> <Plus className="inline w-3.5 h-3.5 text-blue-400" /></p>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
              <p className="text-gray-300 text-sm">Tap <strong className="text-white">Add</strong> in the top-right</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
              <p className="text-gray-300 text-sm">Open <strong className="text-white">KAS Tracker</strong> → press <strong className="text-white">START</strong></p>
            </div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-3 py-2">
            <p className="text-yellow-300 text-xs font-semibold">⚠️ Must use Safari — Chrome on iPhone cannot install PWAs</p>
          </div>
          <button onClick={() => router.push("/tracker")} className="text-gray-600 text-xs text-center underline underline-offset-2">Skip — open in browser</button>
        </div>
      </div>
    );
  }

  /* ── Android manual (no prompt available) ── */
  if (phase === "android-manual") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <p className="text-white text-xl font-bold">KAS Tracker</p>
          <p className="text-green-400 text-sm">✓ Logged in</p>
        </div>
        <div className="bg-gray-900 border-t border-gray-700 rounded-t-3xl px-6 pt-5 pb-12 flex flex-col gap-4 shadow-2xl">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto" />
          <p className="text-white font-bold text-center">Add to Home Screen</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
              <p className="text-gray-300 text-sm">Tap the <strong className="text-white">⋮ menu</strong> in Chrome <MoreVertical className="inline w-3.5 h-3.5 text-gray-400" /></p>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
              <p className="text-gray-300 text-sm">Tap <strong className="text-white">Add to Home Screen</strong> <Download className="inline w-3.5 h-3.5 text-blue-400" /></p>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
              <p className="text-gray-300 text-sm">Open <strong className="text-white">KAS Tracker</strong> → press <strong className="text-white">START</strong></p>
            </div>
          </div>
          <button onClick={() => router.push("/tracker")} className="text-gray-600 text-xs text-center underline underline-offset-2">Skip — open in browser</button>
        </div>
      </div>
    );
  }

  /* ── Desktop ── */
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-6">
      <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900">
        <Smartphone className="w-10 h-10 text-white" />
      </div>
      <p className="text-white font-bold text-lg">KAS Tracker</p>
      <p className="text-gray-400 text-sm text-center">Open this link on your phone to install the app.</p>
      <button onClick={() => router.push("/tracker")} className="text-blue-400 text-sm underline underline-offset-2">Open Tracker</button>
    </div>
  );
}
