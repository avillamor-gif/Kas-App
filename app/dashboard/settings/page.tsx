"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

type Settings = {
  appName: string;
  appShortName: string;
  iconColor: string;
  themeColor: string;
};

const ICON_COLORS = [
  { name: "Orange", hex: "#FF6B35" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#10B981" },
  { name: "Red", hex: "#EF4444" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Yellow", hex: "#F59E0B" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    appName: "KAS Family Tracker",
    appShortName: "KAS Tracker",
    iconColor: "#FF6B35",
    themeColor: "#FF6B35",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch (e) {
        setError("Failed to load settings");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        
        // Update manifest.json in browser
        if (navigator && 'serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister());
          });
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (e) {
      setError("Failed to save settings");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-white transition flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-white font-semibold">Settings</span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">App Customization</h1>
          <p className="text-gray-400 text-sm mb-6">
            Customize the app name and icon theme. Changes will appear in the next build.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3">
                ✓ Settings saved successfully
              </div>
            )}

            {/* App Full Name */}
            <div>
              <label className="block text-white font-medium text-sm mb-2">
                App Full Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appName: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition"
                placeholder="e.g., KAS Family Tracker"
              />
              <p className="text-gray-500 text-xs mt-1">
                Shows in system app stores and about screens
              </p>
            </div>

            {/* App Short Name */}
            <div>
              <label className="block text-white font-medium text-sm mb-2">
                App Short Name
              </label>
              <input
                type="text"
                value={settings.appShortName}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appShortName: e.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition"
                placeholder="e.g., KAS Tracker"
              />
              <p className="text-gray-500 text-xs mt-1">
                Shows on home screen (keep short for mobile)
              </p>
            </div>

            {/* Icon Color */}
            <div>
              <label className="block text-white font-medium text-sm mb-3">
                Icon Color
              </label>
              <div className="grid grid-cols-4 gap-3">
                {ICON_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        iconColor: color.hex,
                        themeColor: color.hex,
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                      settings.iconColor === color.hex
                        ? "border-white bg-gray-800"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-gray-300 text-xs">{color.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-3">
                App icon background color. Current: {settings.iconColor}
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-4">
                Preview
              </p>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: settings.iconColor }}
                >
                  <div className="text-white text-2xl">📍</div>
                </div>
                <div>
                  <p className="text-white font-semibold">{settings.appShortName}</p>
                  <p className="text-gray-500 text-sm">{settings.appName}</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save Settings"}
              </button>
              <p className="text-gray-500 text-xs">
                Changes take effect after rebuild
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
