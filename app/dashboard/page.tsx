"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import {
  MapPin,
  Users,
  Mic,
  LogOut,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Shield,
  ChevronRight,
  History,
} from "lucide-react";
import type { MemberLocation } from "@/components/LiveMap";

const MapWrapper = dynamic(() => import("@/components/MapWrapper"), { ssr: false });

type AudioClip = {
  id: string;
  url: string;
  createdAt: string;
  user: { name: string; color: string };
};

type Tab = "map" | "audio" | "members";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [tab, setTab] = useState<Tab>("map");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
    }
  };

  const activeCount = members.filter((m) => m.isTracking).length;
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
          <span className="text-gray-400 text-xs">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-gray-500 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="flex gap-4 px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-semibold">{activeCount} active</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Users className="w-3.5 h-3.5" />
          <span>{members.length} members</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Mic className="w-3.5 h-3.5" />
          <span>{audioClips.length} clips</span>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex border-b border-gray-800 shrink-0">
        {(["map", "audio", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition ${
              tab === t
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "map" && <MapPin className="w-4 h-4 inline mr-1" />}
            {t === "audio" && <Mic className="w-4 h-4 inline mr-1" />}
            {t === "members" && <Users className="w-4 h-4 inline mr-1" />}
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {tab === "map" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar: member list */}
            <aside className="w-64 shrink-0 border-r border-gray-800 overflow-y-auto hidden md:block">
              <div className="p-3">
                <p className="text-gray-500 text-xs uppercase font-semibold mb-2">Family Members</p>
                {members.length === 0 && (
                  <p className="text-gray-600 text-sm">No members yet</p>
                )}
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMember(m.id)}
                    className={`w-full text-left rounded-lg p-2.5 mb-1 flex items-center gap-2.5 transition ${
                      selectedId === m.id ? "bg-gray-800" : "hover:bg-gray-900"
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
              </div>
              {selectedMember && (
                <div className="border-t border-gray-800 p-3">
                  <button
                    onClick={() => fetchHistory(selectedMember.id)}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs"
                  >
                    <History className="w-3.5 h-3.5" />
                    Reload trail
                  </button>
                  <p className="text-gray-600 text-xs mt-1">
                    {historyPoints.length} trail points shown
                  </p>
                </div>
              )}
            </aside>

            {/* Map area */}
            <div className="flex-1 p-3">
              <MapWrapper
                members={members}
                selectedId={selectedId}
                historyPoints={historyPoints}
              />
            </div>
          </div>
        )}

        {tab === "audio" && (
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-white font-semibold mb-4">Audio Recordings</h2>
            {audioClips.length === 0 ? (
              <div className="text-center text-gray-600 mt-16">
                <Mic className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No audio clips yet</p>
                <p className="text-xs mt-1">Clips appear when a member activates tracking</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {audioClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: clip.user.color }}
                    >
                      {clip.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{clip.user.name}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(clip.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <audio
                      controls
                      src={clip.url}
                      className="w-full sm:w-64 h-8"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "members" && (
          <MembersTab onRefresh={fetchMembers} />
        )}
      </div>
    </div>
  );
}

// ─── Members management tab ───────────────────────────────────────────────────

function MembersTab({ onRefresh }: { onRefresh: () => void }) {
  const [users, setUsers] = useState<{
    id: string; name: string; email: string; role: string;
    color: string; isTracking: boolean; lastSeen: string | null; createdAt: string;
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the family group?`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
    onRefresh();
  };

  const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Family Members</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg transition"
        >
          + Add Member
        </button>
      </div>

      {/* Add member form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 flex flex-col gap-3"
        >
          <h3 className="text-white font-medium text-sm">New Member</h3>
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs rounded px-3 py-1.5">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
              >
                <option value="member">Member (tracked)</option>
                <option value="admin">Admin (controller)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    form.color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg"
            >
              {saving ? "Saving…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white text-sm px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Member list */}
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">{u.name}</p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    u.role === "admin"
                      ? "bg-blue-900 text-blue-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {u.role}
                </span>
                {u.isTracking && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-900 text-green-300 font-medium">
                    Live
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs truncate">{u.email}</p>
              {u.lastSeen && (
                <p className="text-gray-600 text-xs">
                  Last seen: {new Date(u.lastSeen).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(u.id, u.name)}
              className="text-gray-600 hover:text-red-400 transition text-xs shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center text-gray-600 mt-10">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No members yet — add the first one above</p>
          </div>
        )}
      </div>
    </div>
  );
}
