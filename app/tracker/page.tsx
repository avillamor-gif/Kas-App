"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  MapPin,
  Mic,
  MicOff,
  Power,
  PowerOff,
  Satellite,
  LogOut,
} from "lucide-react";

type Status = "idle" | "active" | "error";

export default function TrackerPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Keep screen awake via Wake Lock API if available
    if ("wakeLock" in navigator) {
      try {
        await (navigator as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request("screen");
        addLog("🔒 Screen wake lock acquired");
      } catch {
        addLog("ℹ️ Wake lock not available");
      }
    }
  }, [addLog, sendLocation, startRecordingCycle]);

  const deactivate = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    stopRecordingCycle();

    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracking: false }),
    });

    setStatus("idle");
    setCoords(null);
    addLog("🔴 Tracker deactivated");
  }, [addLog, stopRecordingCycle]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
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
          <span className="text-gray-400 text-xs">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        {/* Big toggle button */}
        <button
          onClick={isActive ? deactivate : activate}
          className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl border-4 transition-all duration-300 ${
            isActive
              ? "bg-red-600 border-red-400 shadow-red-900"
              : "bg-blue-600 border-blue-400 shadow-blue-900"
          }`}
        >
          {isActive ? (
            <>
              <PowerOff className="w-12 h-12 text-white" />
              <span className="text-white text-xs font-bold">STOP</span>
            </>
          ) : (
            <>
              <Power className="w-12 h-12 text-white" />
              <span className="text-white text-xs font-bold">START</span>
            </>
          )}
        </button>

        {/* Status indicators */}
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full ${
                coords ? "bg-green-400 animate-pulse" : "bg-gray-600"
              }`}
            />
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 text-xs">GPS</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full ${
                isRecording ? "bg-red-400 animate-pulse" : "bg-gray-600"
              }`}
            />
            {isRecording ? (
              <Mic className="w-4 h-4 text-red-400" />
            ) : (
              <MicOff className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-gray-500 text-xs">Audio</span>
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
          <p className="text-gray-600 text-xs text-center max-w-xs">
            By activating, you consent to sharing your real-time location and
            audio with your family group administrator.
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
