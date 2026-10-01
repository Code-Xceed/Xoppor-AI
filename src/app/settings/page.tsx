"use client";

/** Settings — integration status, connection tests, setup checklist. */

import { useEffect, useState } from "react";
import { getApiKey, setApiKey } from "@/lib/client";

type Health = {
  ok: boolean;
  authRequired?: boolean;
  integrations: Record<string, string>;
};

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [key, setKeyInput] = useState("");
  const [keyMsg, setKeyMsg] = useState("");

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  async function testTelegram() {
    setTestMsg("Testing…");
    try {
      const res = await fetch("/api/test-telegram", { method: "POST" });
      const data = await res.json();
      setTestMsg(data.message ?? JSON.stringify(data));
    } catch {
      setTestMsg("request failed");
    }
  }

  const items = Object.entries(health?.integrations ?? {});

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">⚙️ Settings</h1>
        <a className="btn" href="/">← Dashboard</a>
      </header>

      <section className="panel mb-6 px-4 py-3">
        <div className="mb-2 text-sm font-semibold">Integrations</div>
        {items.length === 0 && <p className="text-xs text-[var(--muted)]">Loading…</p>}
        <ul className="space-y-1 text-sm">
          {items.map(([name, status]) => (
            <li key={name} className="flex items-center justify-between">
              <span className="capitalize">{name}</span>
              <span
                className="badge"
                style={
                  status.startsWith("off")
                    ? { background: "#374151", color: "#9ca3af" }
                    : { background: "#064e3b", color: "#6ee7b7" }
                }
              >
                {status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mb-6 px-4 py-3">
        <div className="mb-2 text-sm font-semibold">Dashboard access key</div>
        <p className="text-xs text-[var(--muted)] mb-2">
          Only needed when <code>CRON_SECRET</code> is set (e.g. public deployments). Paste the same value here once — it is stored in this browser only.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            type="password"
            placeholder="CRON_SECRET value"
            value={key}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setApiKey(key);
              setKeyInput("");
              setKeyMsg(key.trim() ? "saved ✓ — the dashboard will send it with every request" : "cleared");
            }}
          >
            Save
          </button>
        </div>
        {keyMsg && <p className="mt-2 text-xs text-[var(--muted)]">{keyMsg}</p>}
        {health?.authRequired && !getApiKey() && (
          <p className="mt-2 text-xs" style={{ color: "#fbbf24" }}>⚠️ CRON_SECRET is active and no key is stored yet.</p>
        )}
      </section>

      <section className="panel mb-6 px-4 py-3">
        <div className="mb-2 text-sm font-semibold">Connection test</div>
        <button className="btn" onClick={testTelegram}>Test Telegram push</button>
        {testMsg && <p className="mt-2 text-xs text-[var(--muted)]">{testMsg}</p>}
      </section>

      <section className="panel px-4 py-3 text-sm">
        <div className="mb-2 text-sm font-semibold">Setup checklist</div>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--muted)]">
          <li>Gemini API key (free) → <code>aistudio.google.com/apikey</code> → <code>GEMINI_API_KEY</code></li>
          <li>Telegram bot via @BotFather → <code>TELEGRAM_BOT_TOKEN</code> + <code>TELEGRAM_CHAT_ID</code></li>
          <li>Reddit script app → <code>REDDIT_CLIENT_ID/SECRET</code> (optional, unlocks r/forhire etc.)</li>
          <li>Tune your niche in <code>src/lib/skills.ts</code> — skills, categories, conference topics</li>
          <li>Start the scheduler: set <code>SCHEDULER_ENABLED=true</code> and run <code>npm start</code></li>
        </ol>
      </section>
    </main>
  );
}
