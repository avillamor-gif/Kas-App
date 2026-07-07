"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  MapPin,
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
  Search,
  Users,
  Trash2,
} from "lucide-react";
import type { MemberLocation } from "@/components/LiveMap";

const MapWrapper = dynamic(() => import("@/components/MapWrapper"), { ssr: false });

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MemberLocation = {
  id: string;
  name: string;
  color: string;
  isTracking: boolean;
  trackingEnabled: boolean;
  sleepLocked: boolean;
  lastSeen: string | null;
  locations: Array<{ lat: number; lng: number; accuracy?: number }> | null;
};


export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [historyRange, setHistoryRange] = useState<"1h" | "6h" | "24h" | "7d" | "all">("24h");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

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
      const res = await fetch("/api/location", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);



  const fetchHistory = useCallback(async (userId: string, range?: string) => {
    const sinceMap: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };
    const r = range ?? "24h";
    const sinceParam = sinceMap[r]
      ? `&since=${new Date(Date.now() - sinceMap[r]).toISOString()}`
      : "";
    const res = await fetch(`/api/location/history?userId=${userId}&limit=2000${sinceParam}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setHistoryPoints(data.map((p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng })));
    }
  }, []);

  // Realtime subscription: re-fetch members the instant a new Location row is inserted
  useEffect(() => {
    const channel = supabaseBrowser
      .channel("location-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Location" },
        () => { fetchMembers(); }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  // Poll every 10 seconds as fallback
  useEffect(() => {
    fetchMembers();
    const interval = setInterval(() => {
      fetchMembers();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const handleSelectMember = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setHistoryPoints([]);
    } else {
      setSelectedId(id);
      fetchHistory(id, historyRange);
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
            onClick={() => { fetchMembers(); }}
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

        {/* ── Combined header row: sidebar label + tabs aligned side by side ── */}
        <div className="border-b border-gray-800 shrink-0 flex items-stretch">

          {/* Sidebar column header — same width as sidebar (w-64) */}
          <div className="w-64 shrink-0 border-r border-gray-800 flex items-center justify-between px-3 py-0">
            <p className="text-gray-400 text-xs uppercase font-semibold tracking-wide">Family Members</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">{members.filter(m => m.isTracking).length} live</span>
            </div>
          </div>

          {/* Tab bar — right side */}
          <div className="flex flex-1 items-stretch">
            {/* Manage Members — right-aligned */}
            <div className="ml-auto flex items-center pr-4">
              <button
                onClick={() => router.push("/dashboard/members")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
              >
                <Users className="w-3.5 h-3.5" />
                Manage Members
              </button>
            </div>
          </div>
        </div>

        {/* ── Content: always-visible sidebar + tabbed right panel ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Always-visible sidebar ── */}
          <aside className="w-64 shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">

            {/* Search box */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 transition">
                <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members…"
                  className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-600"
                />
                {memberSearch && (
                  <button onClick={() => setMemberSearch("")} className="text-gray-600 hover:text-gray-400 text-sm leading-none">
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Live member list */}
            <div className="flex-1 overflow-y-auto">

              {members.length === 0 && (
                <p className="text-gray-600 text-xs px-3 py-2">No members yet</p>
              )}

              {members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 && members.length > 0 && (
                <p className="text-gray-600 text-xs px-3 py-2">No results for "{memberSearch}"</p>
              )}

              {members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).map((m) => (
                <div key={m.id} className={`border-l-2 transition ${selectedId === m.id ? "bg-gray-800 border-blue-500" : "border-transparent hover:bg-gray-900"}`}>
                  <button
                    onClick={() => handleSelectMember(m.id)}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5"
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
                  {/* Admin controls: Lock screen + Stop tracking */}
                  {m.isTracking && (
                    <div className="flex items-center gap-1 px-3 pb-2">
                      <button
                        title={m.sleepLocked ? "Unlock screen (let member see)" : "Lock screen (fake off)"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch(`/api/users/${m.id}`, {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ sleepLocked: !m.sleepLocked }),
                          });
                          fetchMembers();
                        }}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition ${
                          m.sleepLocked
                            ? "bg-orange-900/40 border-orange-700 text-orange-400 hover:bg-orange-900/70"
                            : "border-gray-700 text-gray-400 hover:border-orange-600 hover:text-orange-400"
                        }`}
                      >
                        {m.sleepLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {m.sleepLocked ? "Locked" : "Lock"}
                      </button>
                      <button
                        title="Stop tracking this member"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch(`/api/users/${m.id}`, {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ trackingEnabled: false }),
                          });
                          fetchMembers();
                        }}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-400 hover:border-red-700 hover:text-red-400 transition"
                      >
                        <WifiOff className="w-2.5 h-2.5" />
                        Stop
                      </button>
                    </div>
                  )}
                  {!m.trackingEnabled && (
                    <div className="flex items-center gap-1 px-3 pb-2">
                      <button
                        title="Re-enable tracking for this member"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch(`/api/users/${m.id}`, {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ trackingEnabled: true }),
                          });
                          fetchMembers();
                        }}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-green-800 text-green-500 hover:bg-green-900/30 transition"
                      >
                        <Wifi className="w-2.5 h-2.5" />
                        Enable tracking
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {selectedMember && !memberSearch && (
                <div className="border-t border-gray-800 px-3 py-2 space-y-2">
                  {/* Time range filter */}
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase font-semibold mb-1 tracking-wide">Trail range</p>
                    <div className="flex flex-wrap gap-1">
                      {(["1h", "6h", "24h", "7d", "all"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setHistoryRange(r);
                            fetchHistory(selectedMember.id, r);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                            historyRange === r
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                          }`}
                        >
                          {r === "all" ? "All" : `Last ${r}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trail info + reload */}
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-xs">{historyPoints.length} trail points</p>
                    <button
                      onClick={() => fetchHistory(selectedMember.id, historyRange)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                    >
                      <History className="w-3 h-3" />
                      Reload
                    </button>
                  </div>

                  {/* Clear history */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={async () => {
                        if (!confirm(`Clear location history for ${selectedMember.name} older than 30 days?`)) return;
                        const before = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                        await fetch("/api/location", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedMember.id, before }) });
                        fetchHistory(selectedMember.id, historyRange);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400 transition"
                    >
                      Clear &gt;30d
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete ALL location history for ${selectedMember.name}? This cannot be undone.`)) return;
                        await fetch("/api/location", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedMember.id }) });
                        setHistoryPoints([]);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-500 hover:border-red-700 hover:text-red-400 transition"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>

          </aside>

          {/* ── Right: map content ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-3 min-h-0">
              <MapWrapper
                members={members}
                selectedId={selectedId}
                historyPoints={historyPoints}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
