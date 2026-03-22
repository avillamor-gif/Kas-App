"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Mic,
  Video,
  LogOut,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Shield,
  ChevronRight,
  History,
  Lock,
  Unlock,
} from "lucide-react";
import type { MemberLocation } from "@/components/LiveMap";

const MapWrapper = dynamic(() => import("@/components/MapWrapper"), { ssr: false });

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AudioClip = {
  id: string;
  url: string;
  createdAt: string;
  user: { name: string; color: string };
};


export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [tab, setTab] = useState<"map" | "audio" | "camera">("map");

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

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/location");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudio = useCallback(async () => {
    const res = await fetch("/api/audio");
    if (res.ok) setAudioClips(await res.json());
  }, []);

  const fetchHistory = useCallback(async (userId: string) => {
    const res = await fetch(`/api/location/history?userId=${userId}&limit=300`);
    if (res.ok) {
      const data = await res.json();
      setHistoryPoints(data.map((p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng })));
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchMembers();
    fetchAudio();
    const interval = setInterval(() => {
      fetchMembers();
      fetchAudio();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchMembers, fetchAudio]);

  const handleSelectMember = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setHistoryPoints([]);
    } else {
      setSelectedId(id);
      fetchHistory(id);
      setTab("map");
    }
  };

  const selectedMember = members.find((m) => m.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="text-white font-bold">KAS Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-gray-500 text-xs hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { fetchMembers(); fetchAudio(); }}
            className="text-gray-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-gray-400 text-xs">{userName}</span>
          <button onClick={handleSignOut} className="text-gray-500 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main layout: tab bar full-width on top, content below */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Tab bar ── */}
        <div className="border-b border-gray-800 shrink-0 flex">
          {(["map", "audio", "camera"] as const).map((t) => {
            const Icon = t === "map" ? MapPin : t === "audio" ? Mic : Video;
            const label = t === "map" ? "Map" : t === "audio" ? "Audio" : "Camera";
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {t === "audio" && audioClips.filter(c => !c.url.endsWith(".webm")).length > 0 && (
                  <span className="bg-gray-700 text-gray-300 text-[10px] rounded-full px-1.5">
                    {audioClips.filter(c => !c.url.endsWith(".webm")).length}
                  </span>
                )}
                {t === "camera" && audioClips.filter(c => c.url.endsWith(".webm")).length > 0 && (
                  <span className="bg-gray-700 text-gray-300 text-[10px] rounded-full px-1.5">
                    {audioClips.filter(c => c.url.endsWith(".webm")).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Map tab: sidebar aligned exactly with map */}
          {tab === "map" && (
            <>
              {/* Members sidebar — same height as map */}
              <aside className="w-64 shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">

                {/* Live member list */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Family Members</p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-green-400 text-xs">{members.filter(m => m.isTracking).length} live</span>
                    </div>
                  </div>

                  {members.length === 0 && (
                    <p className="text-gray-600 text-xs px-3 py-2">No members yet</p>
                  )}

                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMember(m.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition border-l-2 ${
                        selectedId === m.id
                          ? "bg-gray-800 border-blue-500"
                          : "border-transparent hover:bg-gray-900"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{m.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {m.isTracking ? (
                            <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400 text-xs">Live</span></>
                          ) : (
                            <><WifiOff className="w-3 h-3 text-gray-600" /><span className="text-gray-600 text-xs">Offline</span></>
                          )}
                        </div>
                        {m.lastSeen && (
                          <p className="text-gray-600 text-xs flex items-center gap-0.5 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(m.lastSeen).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      {m.locations[0] && <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                    </button>
                  ))}

                  {selectedMember && (
                    <div className="border-t border-gray-800 px-3 py-2">
                      <button
                        onClick={() => fetchHistory(selectedMember.id)}
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <History className="w-3.5 h-3.5" />
                        Reload trail
                      </button>
                      <p className="text-gray-600 text-xs mt-1">{historyPoints.length} trail points</p>
                    </div>
                  )}
                </div>

                {/* Manage members section */}
                <MembersTab onRefresh={fetchMembers} />
              </aside>

              {/* Map — fills remaining space at same height as sidebar */}
              <div className="flex-1 p-3 min-h-0">
                <MapWrapper
                  members={members}
                  selectedId={selectedId}
                  historyPoints={historyPoints}
                />
              </div>
            </>
          )}

          {/* Audio tab */}
          {tab === "audio" && (
            <div className="flex-1 overflow-y-auto p-4">
              {audioClips.filter(c => !c.url.endsWith(".webm")).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Mic className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">No audio clips yet</p>
                  <p className="text-gray-600 text-xs mt-1">Clips appear when a member activates tracking.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {audioClips.filter(c => !c.url.endsWith(".webm")).map((clip) => (
                    <div
                      key={clip.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: clip.user.color }}
                      >
                        {clip.user.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium">{clip.user.name}</p>
                        <p className="text-gray-500 text-xs">{new Date(clip.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <audio controls src={clip.url} className="h-8" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Camera tab */}
          {tab === "camera" && (
            <div className="flex-1 overflow-y-auto p-4">
              {audioClips.filter(c => c.url.endsWith(".webm")).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Video className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">No camera recordings yet</p>
                  <p className="text-gray-600 text-xs mt-1">Clips appear when a member records video while tracking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {audioClips.filter(c => c.url.endsWith(".webm")).map((clip) => (
                    <div
                      key={clip.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                    >
                      <video controls src={clip.url} className="w-full aspect-video object-cover" />
                      <div className="p-2 flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: clip.user.color }}
                        >
                          {clip.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{clip.user.name}</p>
                          <p className="text-gray-500 text-[10px]">{new Date(clip.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Members management tab ───────────────────────────────────────────────────

function MembersTab({ onRefresh }: { onRefresh: () => void }) {
  const [users, setUsers] = useState<{
    id: string; name: string; email: string; role: string;
    color: string; isTracking: boolean; lastSeen: string | null; createdAt: string;
    sleepLocked: boolean;
  }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member", color: "#3B82F6" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to create user");
    } else {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "member", color: "#3B82F6" });
      fetchUsers();
      onRefresh();
    }
  };

  const handleToggleSleepLock = async (id: string, current: boolean) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleepLocked: !current }),
    });
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the family group?`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
    onRefresh();
  };

  const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

  return (
    <div className="border-t border-gray-800 shrink-0">
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Manage</p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1 rounded-lg transition"
        >
          + Add
        </button>
      </div>

      {/* Add member form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mx-3 mb-2 bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2"
        >
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs rounded px-2 py-1">
              {error}
            </div>
          )}
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
            placeholder="Full name"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
            placeholder="Email"
          />
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
            placeholder="Password"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
          >
            <option value="member">Member (tracked)</option>
            <option value="admin">Admin (controller)</option>
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-5 h-5 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded-lg"
            >
              {saving ? "Saving…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white text-xs px-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Member list */}
      <div className="overflow-y-auto max-h-52 px-3 pb-3 flex flex-col gap-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-gray-900/60 rounded-lg px-2 py-1.5 flex items-center gap-2"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{u.name}</p>
              <p className="text-gray-600 text-[10px] truncate leading-tight">{u.email}</p>
            </div>
            <button
              onClick={() => handleToggleSleepLock(u.id, u.sleepLocked)}
              title={u.sleepLocked ? "Unlock screen" : "Lock screen"}
              className={`transition shrink-0 p-1 rounded ${
                u.sleepLocked ? "text-orange-400" : "text-gray-600 hover:text-orange-400"
              }`}
            >
              {u.sleepLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleDelete(u.id, u.name)}
              className="text-gray-700 hover:text-red-400 transition shrink-0 text-sm leading-none px-0.5"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-3">No members yet</p>
        )}
      </div>
    </div>
  );
}
