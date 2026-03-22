"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Search,
  Plus,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Radio,
  RadioTower,
  Pencil,
  Trash2,
  QrCode,
  Copy,
  Check,
  X,
  Shield,
  User,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  isTracking: boolean;
  sleepLocked: boolean;
  trackingEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  // Add member form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member", color: "#3B82F6" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit member
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", color: "" });

  // QR
  const [qrMemberId, setQrMemberId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const patch = async (id: string, payload: Record<string, unknown>) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    fetchMembers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the family group? This cannot be undone.`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchMembers();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setFormError(d.error ?? "Failed to create member");
    } else {
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "member", color: "#3B82F6" });
      fetchMembers();
    }
  };

  const handleEdit = async (id: string) => {
    await patch(id, editForm);
    setEditId(null);
  };

  const handleQr = async (member: Member) => {
    if (qrMemberId === member.id) { setQrMemberId(null); setQrUrl(null); return; }
    setQrMemberId(member.id);
    setQrUrl(null);
    setQrLoading(true);
    try {
      // Generate a unique one-time magic login link for this specific member.
      // Scanning the QR will log them in and land on /install to prompt PWA install.
      const res = await fetch(`/api/auth/magic-token/${member.id}`, { method: "POST" });
      const json = await res.json();
      if (json.url) {
        setQrUrl(json.url);
      } else {
        setQrUrl(null);
      }
    } catch {
      setQrUrl(null);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const live = filtered.filter((m) => m.isTracking);
  const offline = filtered.filter((m) => !m.isTracking);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white transition flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">Manage Members</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 focus-within:border-blue-500 transition">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 gap-0.5 shrink-0">
          <button
            onClick={() => setView("grid")}
            title="Grid view"
            className={`p-1.5 rounded-lg transition ${
              view === "grid" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            title="List view"
            className={`p-1.5 rounded-lg transition ${
              view === "list" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowAdd((s) => !s)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            showAdd
              ? "bg-gray-800 text-white border border-gray-700"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancel" : "Add Member"}
        </button>
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/40">
          <h3 className="text-white font-medium mb-4">New Member</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formError && (
              <div className="col-span-full bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              placeholder="Full name"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              placeholder="Email address"
            />
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
              placeholder="Password"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="member">Member (tracked)</option>
              <option value="admin">Admin (controller)</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm shrink-0">Color:</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition"
              >
                {saving ? "Creating…" : "Create Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <p className="text-gray-600 text-sm text-center py-12">Loading members…</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <User className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No members found</p>
          </div>
        )}

        {/* Live section */}
        {live.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-green-400 text-xs font-semibold uppercase tracking-wide">Live ({live.length})</h2>
            </div>
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {live.map((m) => (
                  <MemberGridCard
                    key={m.id}
                    member={m}
                    qrMemberId={qrMemberId}
                    qrUrl={qrUrl}
                    qrLoading={qrLoading}
                    copied={copied}
                    onEdit={(id) => { setEditId(id); setEditForm({ name: m.name, role: m.role, color: m.color }); }}
                    onDelete={handleDelete}
                    onPatch={patch}
                    onQr={handleQr}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {live.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    editId={editId}
                    editForm={editForm}
                    qrMemberId={qrMemberId}
                    qrUrl={qrUrl}
                    qrLoading={qrLoading}
                    copied={copied}
                    onEdit={(id) => { setEditId(id); setEditForm({ name: m.name, role: m.role, color: m.color }); }}
                    onEditSave={handleEdit}
                    onEditCancel={() => setEditId(null)}
                    onEditFormChange={setEditForm}
                    onDelete={handleDelete}
                    onPatch={patch}
                    onQr={handleQr}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Offline section */}
        {offline.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Offline ({offline.length})</h2>
            </div>
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {offline.map((m) => (
                  <MemberGridCard
                    key={m.id}
                    member={m}
                    qrMemberId={qrMemberId}
                    qrUrl={qrUrl}
                    qrLoading={qrLoading}
                    copied={copied}
                    onEdit={(id) => { setEditId(id); setEditForm({ name: m.name, role: m.role, color: m.color }); }}
                    onDelete={handleDelete}
                    onPatch={patch}
                    onQr={handleQr}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {offline.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    editId={editId}
                    editForm={editForm}
                    qrMemberId={qrMemberId}
                    qrUrl={qrUrl}
                    qrLoading={qrLoading}
                    copied={copied}
                    onEdit={(id) => { setEditId(id); setEditForm({ name: m.name, role: m.role, color: m.color }); }}
                    onEditSave={handleEdit}
                    onEditCancel={() => setEditId(null)}
                    onEditFormChange={setEditForm}
                    onDelete={handleDelete}
                    onPatch={patch}
                    onQr={handleQr}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Member Grid Card ────────────────────────────────────────────────────────

function MemberGridCard({
  member: m,
  qrMemberId,
  qrUrl,
  qrLoading,
  copied,
  onEdit,
  onDelete,
  onPatch,
  onQr,
  onCopy,
}: {
  member: Member;
  qrMemberId: string | null;
  qrUrl: string | null;
  qrLoading: boolean;
  copied: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onPatch: (id: string, payload: Record<string, unknown>) => void;
  onQr: (member: Member) => void;
  onCopy: (url: string) => void;
}) {
  const showQr = qrMemberId === m.id;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Card body */}
      <div className="p-4 flex flex-col items-center text-center gap-3 flex-1">
        {/* Avatar + status dot */}
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: m.color }}
          >
            {m.name.charAt(0).toUpperCase()}
          </div>
          <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
            m.isTracking ? "bg-green-400" : "bg-gray-600"
          }`} />
        </div>

        {/* Name + badges */}
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{m.name}</p>
          <p className="text-gray-500 text-xs mt-0.5 truncate max-w-35">{m.email}</p>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              m.role === "admin" ? "bg-blue-900/60 text-blue-300" : "bg-gray-800 text-gray-400"
            }`}>
              {m.role}
            </span>
            {m.isTracking && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/60 text-green-300 font-medium flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> Live
              </span>
            )}
            {!m.trackingEnabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 text-red-400 font-medium">
                Tracking off
              </span>
            )}
            {m.sleepLocked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-400 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>
          {m.lastSeen && (
            <p className="text-gray-700 text-[10px] mt-1.5">
              {new Date(m.lastSeen).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Action strip */}
      <div className="border-t border-gray-800 px-3 py-2.5 flex items-center justify-between gap-1">
        {/* Tracking toggle */}
        <button
          onClick={() => onPatch(m.id, { trackingEnabled: !m.trackingEnabled })}
          title={m.trackingEnabled ? "Disable tracking" : "Enable tracking"}
          className={`p-1.5 rounded-lg border transition ${
            m.trackingEnabled
              ? "border-green-700 text-green-400 hover:border-red-700 hover:text-red-400"
              : "border-red-800 text-red-500 hover:border-green-700 hover:text-green-400"
          }`}
        >
          {m.trackingEnabled ? <RadioTower className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
        </button>

        {/* Sleep lock toggle */}
        <button
          onClick={() => onPatch(m.id, { sleepLocked: !m.sleepLocked })}
          title={m.sleepLocked ? "Unlock screen" : "Lock screen"}
          className={`p-1.5 rounded-lg border transition ${
            m.sleepLocked
              ? "border-orange-700 text-orange-400"
              : "border-gray-700 text-gray-500 hover:text-orange-400 hover:border-orange-700"
          }`}
        >
          {m.sleepLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        {/* QR */}
        <button
          onClick={() => onQr(m)}
          title="Show install QR"
          className={`p-1.5 rounded-lg border transition ${
            qrMemberId === m.id
              ? "border-blue-500 text-blue-400"
              : "border-gray-700 text-gray-500 hover:text-white hover:border-gray-500"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(m.id)}
          title="Edit member"
          className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(m.id, m.name)}
          title="Remove member"
          className="p-1.5 rounded-lg border border-gray-700 text-gray-600 hover:text-red-400 hover:border-red-800 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* QR panel */}
      {showQr && (
        <div className="border-t border-gray-800 px-3 py-3 bg-gray-900/60">
          {qrLoading ? (
            <p className="text-gray-500 text-xs text-center">Generating…</p>
          ) : qrUrl ? (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={qrUrl} size={110} />
              </div>
              <p className="text-gray-500 text-[10px] text-center">Scan to install &amp; auto-login · expires 24h</p>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 w-full">
                <p className="text-gray-400 text-[10px] truncate flex-1">{qrUrl}</p>
                <button onClick={() => onCopy(qrUrl)} className="text-gray-500 hover:text-white transition shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Member List Card ─────────────────────────────────────────────────────────

function MemberCard({
  member: m,
  editId,
  editForm,
  qrMemberId,
  qrUrl,
  qrLoading,
  copied,
  onEdit,
  onEditSave,
  onEditCancel,
  onEditFormChange,
  onDelete,
  onPatch,
  onQr,
  onCopy,
}: {
  member: Member;
  editId: string | null;
  editForm: { name: string; role: string; color: string };
  qrMemberId: string | null;
  qrUrl: string | null;
  qrLoading: boolean;
  copied: boolean;
  onEdit: (id: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onEditFormChange: (f: { name: string; role: string; color: string }) => void;
  onDelete: (id: string, name: string) => void;
  onPatch: (id: string, payload: Record<string, unknown>) => void;
  onQr: (member: Member) => void;
  onCopy: (url: string) => void;
}) {
  const isEditing = editId === m.id;
  const showQr = qrMemberId === m.id;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Main row */}
      <div className="p-4 flex items-center gap-4">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: m.color }}
        >
          {m.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              <input
                value={editForm.name}
                onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white text-sm outline-none focus:border-blue-500 w-36"
                placeholder="Name"
              />
              <select
                value={editForm.role}
                onChange={(e) => onEditFormChange({ ...editForm, role: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white text-sm outline-none focus:border-blue-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-1 items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onEditFormChange({ ...editForm, color: c })}
                    className={`w-5 h-5 rounded-full border-2 transition ${editForm.color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={() => onEditSave(m.id)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={onEditCancel}
                className="text-gray-500 hover:text-white text-xs px-2 py-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold truncate">{m.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  m.role === "admin" ? "bg-blue-900/60 text-blue-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {m.role}
                </span>
                {m.isTracking && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/60 text-green-300 font-medium flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" /> Live
                  </span>
                )}
                {!m.trackingEnabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 text-red-400 font-medium">
                    Tracking off
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs truncate mt-0.5">{m.email}</p>
              {m.lastSeen && (
                <p className="text-gray-600 text-xs mt-0.5">
                  Last seen {new Date(m.lastSeen).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">

            {/* Enable/Disable tracking */}
            <button
              onClick={() => onPatch(m.id, { trackingEnabled: !m.trackingEnabled })}
              title={m.trackingEnabled ? "Disable tracking" : "Enable tracking"}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                m.trackingEnabled
                  ? "border-green-700 text-green-400 hover:bg-red-900/30 hover:border-red-700 hover:text-red-400"
                  : "border-red-800 text-red-500 hover:bg-green-900/30 hover:border-green-700 hover:text-green-400"
              }`}
            >
              {m.trackingEnabled
                ? <><RadioTower className="w-3.5 h-3.5" /> Tracking on</>
                : <><Radio className="w-3.5 h-3.5" /> Tracking off</>
              }
            </button>

            {/* Lock / Unlock screen */}
            <button
              onClick={() => onPatch(m.id, { sleepLocked: !m.sleepLocked })}
              title={m.sleepLocked ? "Unlock screen" : "Lock screen"}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                m.sleepLocked
                  ? "border-orange-700 text-orange-400 hover:bg-orange-900/30"
                  : "border-gray-700 text-gray-500 hover:text-orange-400 hover:border-orange-700"
              }`}
            >
              {m.sleepLocked ? <><Lock className="w-3.5 h-3.5" /> Locked</> : <><Unlock className="w-3.5 h-3.5" /> Lock</>}
            </button>

            {/* QR install link */}
            <button
              onClick={() => onQr(m)}
              title="Show install QR"
              className={`p-1.5 rounded-lg border transition ${
                qrMemberId === m.id
                  ? "border-blue-500 text-blue-400"
                  : "border-gray-700 text-gray-500 hover:text-white hover:border-gray-500"
              }`}
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              onClick={() => onEdit(m.id)}
              title="Edit member"
              className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(m.id, m.name)}
              title="Remove member"
              className="p-1.5 rounded-lg border border-gray-700 text-gray-600 hover:text-red-400 hover:border-red-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* QR panel */}
      {showQr && (
        <div className="border-t border-gray-800 px-4 py-4 flex flex-col sm:flex-row items-center gap-4 bg-gray-900/60">
          {qrLoading ? (
            <p className="text-gray-500 text-sm">Generating…</p>
          ) : qrUrl ? (
            <>
              <div className="bg-white p-3 rounded-xl shrink-0">
                <QRCodeSVG value={qrUrl} size={140} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">Tracker install link</p>
                <p className="text-gray-500 text-xs mb-3">
                  Share this QR with <strong className="text-gray-300">{m.name}</strong>. Scanning it will <strong className="text-gray-300">automatically log them in</strong> and prompt them to install the app. Link expires in 24 hours.
                </p>
                <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <p className="text-gray-400 text-xs truncate flex-1">{qrUrl}</p>
                  <button
                    onClick={() => onCopy(qrUrl)}
                    className="text-gray-500 hover:text-white transition shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-sm">Failed to generate link</p>
          )}
        </div>
      )}
    </div>
  );
}
