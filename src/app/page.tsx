"use client";

/** Dashboard home — stats, run radar, opportunity feed with category filters, manual entry, CSV export, detail drawer. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { withKey } from "@/lib/client";

type Lead = {
  id: string;
  source: string;
  category: string;
  title: string;
  company: string | null;
  description: string | null;
  url: string;
  location: string | null;
  budget: string | null;
  deadline: string | null;
  contactEmail: string | null;
  contactHandle: string | null;
  score: number;
  status: string;
  scoreReason: string | null;
  signals: string | null;
  skills: string | null;
  notes: string | null;
  discoveredAt: string;
  notifiedAt: string | null;
};

type Stats = {
  total: number; today: number; qualified: number;
  byCategory: { category: string; count: number }[];
  runs: { runType: string; ok: boolean; summary: string | null; createdAt: string }[];
};

const STATUSES = ["all", "new", "qualified", "rejected", "archived"] as const;

const CATEGORY_META: Record<string, { label: string; emoji: string; color: CSSProperties }> = {
  job: { label: "Job", emoji: "💼", color: { background: "#1e3a8a", color: "#93c5fd" } },
  freelance: { label: "Freelance", emoji: "🧑‍💻", color: { background: "#064e3b", color: "#6ee7b7" } },
  internship: { label: "Internship", emoji: "🎓", color: { background: "#4c1d95", color: "#c4b5fd" } },
  hackathon: { label: "Hackathon", emoji: "⚡", color: { background: "#713f12", color: "#fde68a" } },
  event: { label: "Event", emoji: "🎤", color: { background: "#701a75", color: "#f5d0fe" } },
  bounty: { label: "Bounty", emoji: "🪙", color: { background: "#7c2d12", color: "#fdba74" } },
};

function categoryBadge(category: string) {
  const meta = CATEGORY_META[category] ?? { label: category, emoji: "❓", color: { background: "#374151", color: "#d1d5db" } };
  return (
    <span className="badge" style={meta.color}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function statusColor(status: string): CSSProperties {
  switch (status) {
    case "qualified": return { background: "#064e3b", color: "#6ee7b7" };
    case "archived": return { background: "#1f2937", color: "#9ca3af" };
    case "rejected": return { background: "#450a0a", color: "#fca5a5" };
    default: return { background: "#374151", color: "#d1d5db" };
  }
}

function scoreColor(score: number): CSSProperties {
  if (score >= 70) return { color: "#34d399", fontWeight: 700 };
  if (score >= 40) return { color: "#fbbf24" };
  return { color: "#6b7280" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function deadlineInfo(iso: string | null): { text: string; urgent: boolean } | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: "overdue", urgent: true };
  if (days === 0) return { text: "due today", urgent: true };
  if (days === 1) return { text: "1 day left", urgent: true };
  if (days <= 7) return { text: `${days}d left`, urgent: false };
  return { text: `${days}d left`, urgent: false };
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ai, setAi] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [total, setTotal] = useState(0);
  const [needsKey, setNeedsKey] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (q) params.set("q", q);
    const [statsRes, leadsRes] = await Promise.all([
      fetch(withKey("/api/stats")),
      fetch(withKey(`/api/leads?${params.toString()}`)),
    ]);
    if (statsRes.status === 401 || leadsRes.status === 401) {
      setNeedsKey(true);
      setLoading(false);
      return;
    }
    setNeedsKey(false);
    const statsData = await statsRes.json();
    const leadsData = await leadsRes.json();
    setStats(statsData.stats);
    setAi(statsData.ai);
    setLeads(leadsData.leads ?? []);
    setTotal(leadsData.total ?? 0);
    setLoading(false);
  }, [status, category, q]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for updates every 30s while idle.
  useEffect(() => {
    const t = setInterval(() => {
      if (!running && !document.hidden) load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load, running]);

  async function loadMore() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (q) params.set("q", q);
    params.set("skip", String(leads.length));
    const res = await fetch(withKey(`/api/leads?${params.toString()}`));
    if (!res.ok) return;
    const data = await res.json();
    setLeads((prev) => [...prev, ...(data.leads ?? [])]);
    setTotal(data.total ?? 0);
  }

  async function runPipeline() {
    setRunning(true);
    setRunMsg("Running radar: scout → score → alert…");
    try {
      const res = await fetch(withKey("/api/scout"), { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setRunMsg(
          `✅ ${data.newLeads} new opportunities · ${data.scored} scored · ${data.hot} hot${data.alerted ? ` · 🎯 ${data.alerted} Telegram alerts sent` : ""}`
        );
      } else {
        setRunMsg(`⚠️ ${JSON.stringify(data).slice(0, 200)}`);
      }
      await load();
    } catch (err) {
      setRunMsg(`❌ ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (q) params.set("q", q);
    params.set("format", "csv");
    window.location.href = withKey(`/api/leads?${params.toString()}`);
  }

  const filtered = useMemo(() => leads, [leads]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🛰 Xoppor AI</h1>
          <p className="text-sm text-[var(--muted)]">AI opportunity radar — scouts jobs, gigs, internships, hackathons, events & bounties. Alerts you on Telegram.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted)] mr-2">AI: {ai}</span>
          <a className="btn" href="/settings">⚙️ Settings</a>
          <button className="btn" onClick={() => setShowAddModal(true)}>+ Add opportunity</button>
          <button className="btn" onClick={exportCsv} title="Export filtered opportunities to CSV">⬇ Export CSV</button>
          <button className="btn btn-primary" onClick={runPipeline} disabled={running}>
            {running ? "Working…" : "▶ Run radar"}
          </button>
        </div>
      </header>

      {needsKey && (
        <div className="panel mb-6 px-4 py-3 text-sm" style={{ borderColor: "#b45309" }}>
          🔒 The API is locked (CRON_SECRET is set). Paste your access key in <a className="underline text-[#34d399]" href="/settings">Settings</a> to use the dashboard.
        </div>
      )}

      {runMsg && <div className="panel mb-6 px-4 py-3 text-sm">{runMsg}</div>}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Total", value: stats?.total },
          { label: "Today", value: stats?.today },
          { label: "Hot (70+)", value: stats?.qualified },
          ...(stats?.byCategory ?? []).slice(0, 3).map((c) => ({
            label: `${CATEGORY_META[c.category]?.emoji ?? ""} ${CATEGORY_META[c.category]?.label ?? c.category}`,
            value: c.count,
          })),
        ].map((c) => (
          <div key={c.label} className="panel px-4 py-3">
            <div className="text-2xl font-bold">{c.value ?? "—"}</div>
            <div className="text-xs text-[var(--muted)]">{c.label}</div>
          </div>
        ))}
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--muted)]">Category:</span>
        <button
          className="badge"
          style={category === "all" ? { background: "#059669", color: "white", borderColor: "#059669" } : undefined}
          onClick={() => setCategory("all")}
        >
          all
        </button>
        {Object.entries(CATEGORY_META).map(([id, meta]) => (
          <button
            key={id}
            className="badge"
            style={category === id ? { background: "#059669", color: "white", borderColor: "#059669" } : undefined}
            onClick={() => setCategory(id)}
          >
            {meta.emoji} {meta.label}
          </button>
        ))}
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            className="badge"
            style={status === s ? { background: "#059669", color: "white", borderColor: "#059669" } : undefined}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
        <input
          className="input ml-auto"
          style={{ maxWidth: 260 }}
          placeholder="Search opportunities…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="panel divide-y divide-[var(--border)]">
          {loading && <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
              No opportunities yet — hit <b>▶ Run radar</b> to scout the internet, or <b>+ Add opportunity</b> to add one manually.
            </div>
          )}
          {filtered.map((lead) => {
            const dl = deadlineInfo(lead.deadline);
            return (
              <button
                key={lead.id}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-[#182130]"
                onClick={() => setSelected(lead)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {categoryBadge(lead.category)}
                      <span className="truncate text-sm font-medium">{lead.title}</span>
                    </div>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {lead.company ?? "—"} · {lead.source} · {lead.location ?? ""}
                      {lead.budget ? ` · 💰 ${lead.budget}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {dl && (
                      <span className="badge" style={{ background: dl.urgent ? "#7f1d1d" : "#374151", color: dl.urgent ? "#fecaca" : "#9ca3af" }} title="Deadline">
                        ⏰ {dl.text}
                      </span>
                    )}
                    {lead.notifiedAt && (
                      <span className="badge" style={{ background: "#0369a1", color: "#e0f2fe" }} title="Dispatched to Telegram">
                        📱
                      </span>
                    )}
                    <span className="badge" style={statusColor(lead.status)}>{lead.status}</span>
                    <span style={scoreColor(lead.score)} className="text-sm">{lead.score}</span>
                  </div>
                </div>
              </button>
            );
          })}
          {leads.length < total && (
            <button className="w-full px-4 py-3 text-center text-xs text-[var(--muted)] transition-colors hover:bg-[#182130]" onClick={loadMore}>
              ↓ Load more — showing {leads.length} of {total}
            </button>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel px-4 py-3">
            <div className="mb-2 text-sm font-semibold">🗂 Opportunities by category</div>
            {stats?.byCategory?.length ? (
              <ul className="space-y-1 text-xs">
                {stats.byCategory.map((c) => (
                  <li key={c.category} className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">
                      {CATEGORY_META[c.category]?.emoji ?? "❓"} {CATEGORY_META[c.category]?.label ?? c.category}
                    </span>
                    <b>{c.count}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">Run the radar to populate.</p>
            )}
          </div>

          <div className="panel px-4 py-3">
            <div className="mb-2 text-sm font-semibold">Recent radar runs</div>
            {stats?.runs?.length ? (
              <ul className="space-y-1 text-xs text-[var(--muted)]">
                {stats.runs.map((r, i) => (
                  <li key={i}>
                    <span style={{ color: r.ok ? "#34d399" : "#f87171" }}>●</span>{" "}
                    {r.runType} · {timeAgo(r.createdAt)} — {r.summary?.slice(0, 80)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">No runs yet.</p>
            )}
          </div>
        </aside>
      </section>

      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </main>
  );
}

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    url: "",
    budget: "",
    category: "job",
    deadline: "",
    contactEmail: "",
    contactHandle: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErr("Title is required");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(withKey("/api/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        onAdded();
      } else {
        setErr(data.error ?? "Failed to create lead");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Opportunity Manually</h2>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        {err && <div className="panel mb-4 p-2 text-xs text-red-400 bg-red-950/40 border-red-800">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Title *</label>
            <input
              className="input"
              placeholder="e.g. Hackathon: AI builders weekend, $50k prizes"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_META).map(([id, meta]) => (
                  <option key={id} value={id}>{meta.emoji} {meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Company / Organizer</label>
              <input
                className="input"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Budget / Prize / Salary</label>
              <input
                className="input"
                placeholder="$3,000 fixed / $70/hr / $50k prizes"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Deadline (optional)</label>
              <input
                className="input"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Reference URL</label>
            <input
              className="input"
              placeholder="https://…"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Details</label>
            <textarea
              className="textarea"
              style={{ minHeight: 90 }}
              placeholder="Paste full text or requirements…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Scoring & Saving…" : "Save & Score with AI"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose, onChanged }: { lead: Lead; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lead.notes ?? "");

  const parsed = useMemo(() => {
    try {
      return {
        skills: lead.skills ? (JSON.parse(lead.skills) as string[]) : [],
        signals: lead.signals ? (JSON.parse(lead.signals) as string[]) : [],
      };
    } catch {
      return { skills: [], signals: [] };
    }
  }, [lead]);

  const dl = deadlineInfo(lead.deadline);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(withKey(`/api/leads/${lead.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1">{categoryBadge(lead.category)}</div>
            <h2 className="text-lg font-semibold">{lead.title}</h2>
            <p className="text-xs text-[var(--muted)]">
              {lead.company ?? "—"} · {lead.source} · {timeAgo(lead.discoveredAt)}
            </p>
          </div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="badge" style={statusColor(lead.status)}>{lead.status}</span>
          <span style={scoreColor(lead.score)}>score {lead.score}</span>
          {dl && (
            <span className="badge" style={{ background: dl.urgent ? "#7f1d1d" : "#374151", color: dl.urgent ? "#fecaca" : "#9ca3af" }}>
              ⏰ {dl.text}
            </span>
          )}
          {parsed.skills.map((s) => (
            <span key={s} className="badge" style={{ background: "#1e3a5f", color: "#93c5fd" }}>{s}</span>
          ))}
          {parsed.signals.map((s) => (
            <span key={s} className="badge" style={{ background: "#713f12", color: "#fde68a" }}>{s}</span>
          ))}
        </div>

        {lead.scoreReason && (
          <p className="mb-4 text-xs text-[var(--muted)]">🧠 {lead.scoreReason}</p>
        )}

        {lead.description && (
          <div className="panel mb-4 max-h-52 overflow-y-auto px-3 py-2 text-sm leading-relaxed">
            {lead.description}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-2 text-sm">
          {lead.url.startsWith("http") ? (
            <a className="text-[#34d399] underline" href={lead.url} target="_blank" rel="noreferrer">
              Open original post ↗
            </a>
          ) : (
            <span className="text-xs text-[var(--muted)]">Manual entry</span>
          )}
          {lead.budget && <span>💰 {lead.budget}</span>}
          {lead.location && <span>📍 {lead.location}</span>}
          {lead.contactEmail && <span>📧 {lead.contactEmail}</span>}
          {lead.contactHandle && <span>👤 {lead.contactHandle}</span>}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn" disabled={busy} onClick={() => patch({ action: "send_telegram" })}>
            📱 Send to Telegram
          </button>
          <button className="btn" disabled={busy} onClick={() => patch({ status: "archived" })}>
            🗄 Archive
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={() => patch({ status: "rejected" })}>
            Reject
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-[var(--muted)]">Notes</label>
          <textarea
            className="textarea"
            style={{ minHeight: 80 }}
            placeholder="Why this matters, application ideas, reminders…"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <button
            className="btn mt-2"
            disabled={busy || notesDraft === (lead.notes ?? "")}
            onClick={() => patch({ notes: notesDraft })}
          >
            Save notes
          </button>
        </div>
      </div>
    </div>
  );
}
