"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Mic,
  MicOff,
  Power,
  PowerOff,
  Satellite,
  LogOut,
  Download,
  X,
  Camera,
  CameraOff,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Video,
  Radio,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Status = "idle" | "active" | "error";

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TrackerPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showExplainer, setShowExplainer] = useState(true);
  const [isCameraRecording, setIsCameraRecording] = useState(false);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch display name from Supabase session
  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.name) setUserName(user.user_metadata.name as string);
      else if (user?.email) setUserName(user.email.split("@")[0]);
    });
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const watchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstallBanner(false);
        setInstallPrompt(null);
      }
    } else {
      // Fallback for iOS / browsers without install prompt
      setShowInstallGuide(true);
    }
  };

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  const sendLocation = useCallback(
    async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy, speed, heading, altitude } = pos.coords;
      setCoords({ lat, lng, accuracy: accuracy ?? undefined });

      try {
        await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, accuracy, speed, heading, altitude }),
        });
        addLog(`📍 Location sent: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } catch {
        addLog("⚠️ Failed to send location");
      }
    },
    [addLog]
  );

  const startRecordingCycle = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      addLog("🎙️ Microphone access granted");

      const recordChunk = () => {
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (blob.size < 500) return; // skip near-empty clips

          const formData = new FormData();
          formData.append("audio", blob, "clip.webm");

          try {
            await fetch("/api/audio", { method: "POST", body: formData });
            addLog("🔊 Audio clip uploaded");
          } catch {
            addLog("⚠️ Failed to upload audio");
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;

        // Stop after 30 seconds to upload
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 30_000);
      };

      recordChunk();
      // Repeat every 35 seconds (5s buffer between clips)
      recordingIntervalRef.current = setInterval(recordChunk, 35_000);
    } catch {
      addLog("⚠️ Microphone permission denied");
    }
  }, [addLog]);

  const stopRecordingCycle = useCallback(() => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startCameraRecordingCycle = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setIsCameraRecording(true);
      addLog("📷 Camera access granted");

      const recordChunk = () => {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size < 1000) return;
          const formData = new FormData();
          formData.append("video", blob, "clip.webm");
          try {
            await fetch("/api/video", { method: "POST", body: formData });
            addLog("🎥 Video clip uploaded");
          } catch {
            addLog("⚠️ Failed to upload video");
          }
        };

        recorder.start();
        cameraRecorderRef.current = recorder;
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 30_000);
      };

      recordChunk();
      cameraIntervalRef.current = setInterval(recordChunk, 35_000);
    } catch {
      addLog("ℹ️ Camera not available or permission denied");
    }
  }, [addLog]);

  const stopCameraRecordingCycle = useCallback(() => {
    if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
    if (cameraRecorderRef.current && cameraRecorderRef.current.state !== "inactive") {
      cameraRecorderRef.current.stop();
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraRecording(false);
  }, []);

  const activate = useCallback(async () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    setStatus("active");
    addLog("✅ Tracker activated");

    // Notify server
    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracking: true }),
    });

    // Start GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => addLog("⚠️ GPS error"),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // Also push every 10 seconds via getCurrentPosition as fallback
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 10_000,
      });
    }, 10_000);

    // Start audio recording
    await startRecordingCycle();

    // Start camera recording
    await startCameraRecordingCycle();

    // Keep screen awake via Wake Lock API if available
    if ("wakeLock" in navigator) {
      try {
        await (navigator as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request("screen");
        addLog("🔒 Screen wake lock acquired");
      } catch {
        addLog("ℹ️ Wake lock not available");
      }
    }
  }, [addLog, sendLocation, startRecordingCycle, startCameraRecordingCycle]);

  const deactivate = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    stopRecordingCycle();
    stopCameraRecordingCycle();

    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracking: false }),
    });

    setStatus("idle");
    setCoords(null);
    addLog("🔴 Tracker deactivated");
  }, [addLog, stopRecordingCycle, stopCameraRecordingCycle]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const isActive = status === "active";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold text-sm">KAS Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Install Guide Modal (iOS fallback) */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Add to Home Screen</h2>
              <button onClick={() => setShowInstallGuide(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <ol className="text-gray-300 text-sm space-y-3">
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button at the bottom of Safari (the box with an arrow pointing up)</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Tap <strong>Add</strong> — the KAS Tracker icon will appear on your home screen</span>
              </li>
            </ol>
            <button
              onClick={() => setShowInstallGuide(false)}
              className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Download App Banner */}
      {showInstallBanner && (
        <div className="bg-blue-900/60 border-b border-blue-700 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-blue-100 text-xs">Install KAS Tracker on your device for best experience</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Install
            </button>
            <button onClick={() => setShowInstallBanner(false)}>
              <X className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-4 gap-6 overflow-y-auto">

        {/* Explainer card — collapsible */}
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setShowExplainer((s) => !s)}
            className="w-full flex items-center justify-between bg-blue-950/60 border border-blue-800 rounded-2xl px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-blue-200 text-sm font-semibold">How KAS Tracker works</span>
            </div>
            {showExplainer
              ? <ChevronUp className="w-4 h-4 text-blue-400" />
              : <ChevronDown className="w-4 h-4 text-blue-400" />}
          </button>

          {showExplainer && (
            <div className="bg-gray-900 border border-gray-800 border-t-0 rounded-b-2xl px-4 pb-5 pt-4">

              {/* 3-column grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">

                {/* Step 1 */}
                <div className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
                    <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight">Install the app</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Tap <strong className="text-gray-200">Download App</strong> and add KAS Tracker to your home screen so it stays active in the background.
                  </p>
                  <div className="bg-gray-900 rounded-lg px-2 py-1.5">
                    <p className="text-yellow-400 text-[10px] font-semibold mb-0.5">⚠️ iPhone</p>
                    <p className="text-gray-400 text-[10px]">Open in <strong className="text-gray-200">Safari</strong> → Share (□↑) → <strong className="text-gray-200">"Add to Home Screen"</strong></p>
                  </div>
                  <div className="bg-gray-900 rounded-lg px-2 py-1.5">
                    <p className="text-green-400 text-[10px] font-semibold mb-0.5">✓ Android</p>
                    <p className="text-gray-400 text-[10px]">Chrome menu → <strong className="text-gray-200">"Add to Home Screen"</strong></p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight">Grant permissions</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">Allow all when prompted:</p>
                  <ul className="flex flex-col gap-1.5">
                    <li className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300 text-[11px]"><strong>Location</strong> — GPS sent every 10s to the live map.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Mic className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300 text-[11px]"><strong>Microphone</strong> — 30s audio clips uploaded continuously.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Camera className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300 text-[11px]"><strong>Camera</strong> — 30s video clips from rear camera.</span>
                    </li>
                  </ul>
                </div>

                {/* Step 3 + 4 + Admin combined */}
                <div className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-3">

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">3</div>
                      <Power className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <p className="text-white text-xs font-semibold leading-tight">Press START</p>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Tracking begins immediately. <strong className="text-gray-200">Minimize</strong> the app — do not close it.
                    </p>
                  </div>

                  <div className="h-px bg-gray-700" />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">4</div>
                      <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <p className="text-white text-xs font-semibold leading-tight">Screen off — still tracking</p>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      GPS, audio &amp; video upload every 30s even with screen off.
                    </p>
                    <div className="bg-gray-900 rounded-lg px-2 py-1.5">
                      <p className="text-orange-400 text-[10px] font-semibold mb-0.5">⚠️ Don't force-close</p>
                      <p className="text-gray-400 text-[10px]">Swiping away stops tracking. Press <strong className="text-gray-200">STOP</strong> in-app to end.</p>
                    </div>
                  </div>

                  <div className="h-px bg-gray-700" />

                  <div className="flex flex-col gap-1">
                    <p className="text-white text-xs font-semibold">👁 Admin sees</p>
                    <ul className="flex flex-col gap-1">
                      <li className="text-gray-400 text-[10px] flex items-start gap-1"><MapPin className="w-2.5 h-2.5 text-green-400 mt-0.5 shrink-0" />Live map pin, updated every 10s</li>
                      <li className="text-gray-400 text-[10px] flex items-start gap-1"><Video className="w-2.5 h-2.5 text-blue-400 mt-0.5 shrink-0" />Location trail history</li>
                      <li className="text-gray-400 text-[10px] flex items-start gap-1"><Mic className="w-2.5 h-2.5 text-red-400 mt-0.5 shrink-0" />Audio recordings</li>
                      <li className="text-gray-400 text-[10px] flex items-start gap-1"><Camera className="w-2.5 h-2.5 text-purple-400 mt-0.5 shrink-0" />Video clips</li>
                    </ul>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>

        {/* Big toggle button */}
        <button
          onClick={isActive ? deactivate : activate}
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl border-4 transition-all duration-300 shrink-0 ${
            isActive
              ? "bg-red-600 border-red-400 shadow-red-900"
              : "bg-blue-600 border-blue-400 shadow-blue-900"
          }`}
        >
          {isActive ? (
            <>
              <PowerOff className="w-10 h-10 text-white" />
              <span className="text-white text-xs font-bold">STOP</span>
            </>
          ) : (
            <>
              <Power className="w-10 h-10 text-white" />
              <span className="text-white text-xs font-bold">START</span>
            </>
          )}
        </button>

        {/* Download App button */}
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
        >
          <Download className="w-4 h-4 text-blue-400" />
          Download App
        </button>

        {/* Status indicators */}
        <div className="flex gap-5">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${coords ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 text-xs">GPS</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-400 animate-pulse" : "bg-gray-600"}`} />
            {isRecording ? <Mic className="w-4 h-4 text-red-400" /> : <MicOff className="w-4 h-4 text-gray-400" />}
            <span className="text-gray-500 text-xs">Audio</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${isCameraRecording ? "bg-purple-400 animate-pulse" : "bg-gray-600"}`} />
            {isCameraRecording ? <Camera className="w-4 h-4 text-purple-400" /> : <CameraOff className="w-4 h-4 text-gray-400" />}
            <span className="text-gray-500 text-xs">Camera</span>
          </div>
        </div>

        {/* Current coordinates */}
        {coords && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Current Position</p>
            <p className="text-white font-mono text-sm">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
            {coords.accuracy && (
              <p className="text-gray-500 text-xs mt-1">
                ±{Math.round(coords.accuracy)}m accuracy
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-2 text-center max-w-xs">
            {error}
          </div>
        )}

        {/* Consent notice */}
        {!isActive && (
          <p className="text-gray-600 text-xs text-center max-w-xs pb-2">
            By activating, you consent to sharing your real-time location, audio,
            and camera footage with your family group administrator.
          </p>
        )}
      </main>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-3 max-h-40 overflow-y-auto">
          {log.map((entry, i) => (
            <p key={i} className="text-gray-500 text-xs font-mono">
              {entry}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
