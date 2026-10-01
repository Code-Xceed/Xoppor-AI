/** Telegram notifier — sends pipeline alerts to your phone. Free & unlimited. */

import { config, hasTelegram } from "./config";
import { categories } from "./skills";
import { createLogger } from "./logger";

const log = createLogger("telegram");

type TgResponse = { ok?: boolean; description?: string };

async function send(text: string): Promise<boolean> {
  if (!hasTelegram()) return false;
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const data = (await res.json()) as TgResponse;
    if (!data.ok) {
      log.warn("telegram send failed", data.description);
      if (data.description?.includes("can't parse entities")) {
        const plainText = text.replace(/<[^>]+>/g, "");
        const fallbackRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: config.telegram.chatId,
            text: plainText,
            disable_web_page_preview: true,
          }),
        });
        const fallbackData = (await fallbackRes.json()) as TgResponse;
        return !!fallbackData.ok;
      }
    }
    return !!data.ok;
  } catch (err) {
    log.warn("telegram error", err instanceof Error ? err.message : err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "3 days left" / "today" / "overdue" from a deadline date. */
function daysLeft(deadline: Date | null | undefined): string | null {
  if (!deadline) return null;
  const diff = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}

export interface OpportunityAlert {
  title: string;
  category?: string | null;
  company?: string | null;
  score: number;
  scoreReason?: string | null;
  skills?: string[] | null;
  signals?: string[] | null;
  description?: string | null;
  budget?: string | null;
  location?: string | null;
  deadline?: Date | null;
  url: string;
  source: string;
  contactEmail?: string | null;
  contactHandle?: string | null;
}

export async function notifyOpportunity(op: OpportunityAlert): Promise<boolean> {
  if (!hasTelegram()) return false;

  const scoreEmoji = op.score >= 85 ? "🔥" : "🎯";
  const cat = categories.find((c) => c.id === op.category);
  const lines: string[] = [
    `${scoreEmoji} <b>OPPORTUNITY RADAR [${op.score}/100]</b>`,
    "",
    `${cat ? `${cat.emoji} <i>${esc(cat.label)}</i>\n` : ""}💼 <b>${esc(op.title)}</b>`,
  ];

  if (op.company) {
    lines.push(`🏢 <b>Client / Company:</b> ${esc(op.company)}`);
  }

  const meta: string[] = [];
  if (op.source) meta.push(`🌐 <i>${esc(op.source.toUpperCase())}</i>`);
  if (op.location) meta.push(`📍 ${esc(op.location)}`);
  if (meta.length > 0) {
    lines.push(meta.join(" · "));
  }

  if (op.budget) {
    const label = op.category === "hackathon" ? "Prize pool" : op.category === "bounty" ? "Bounty" : "Budget / Pay";
    lines.push(`💰 <b>${label}:</b> ${esc(op.budget)}`);
  }

  // Deadline countdown — the "timely updates" part of the radar.
  const left = daysLeft(op.deadline);
  if (left) {
    const urgent = left === "today" || left === "1 day left" || left === "overdue";
    lines.push(`⏰ <b>Deadline:</b> ${esc(left)}${urgent ? " ⚠️" : ""}`);
  }

  // Real context from the source post
  if (op.description) {
    const snippet = op.description.replace(/\s+/g, " ").trim().slice(0, 320);
    lines.push("", `📋 <b>Overview:</b>\n<i>${esc(snippet)}${op.description.length > 320 ? "…" : ""}</i>`);
  }

  // AI Match Analysis
  if (op.scoreReason) {
    lines.push("", `🧠 <b>AI Match Analysis:</b>\n${esc(op.scoreReason)}`);
  }

  // Key Buying Signals
  if (op.signals && op.signals.length > 0) {
    const sigList = op.signals.slice(0, 4).map((s) => `• ${esc(s)}`).join("\n");
    lines.push("", `⚡ <b>Detected Signals:</b>\n${sigList}`);
  }

  // Matched Skills
  if (op.skills && op.skills.length > 0) {
    const tags = op.skills
      .slice(0, 8)
      .map((s) => `#${esc(s.replace(/[^a-zA-Z0-9]/g, ""))}`)
      .join(" ");
    lines.push("", `🏷️ <b>Skills:</b> ${tags}`);
  }

  // Direct Contact Info
  const contacts: string[] = [];
  if (op.contactEmail) contacts.push(`📧 ${esc(op.contactEmail)}`);
  if (op.contactHandle) contacts.push(`👤 @${esc(op.contactHandle)}`);
  if (contacts.length > 0) {
    lines.push("", `📬 <b>Direct Contact:</b> ${contacts.join(" · ")}`);
  }

  lines.push("", `🔗 <a href="${esc(op.url)}"><b>Open Opportunity &amp; Apply Directly →</b></a>`);
  lines.push(`<code>${esc(op.url)}</code>`);

  return send(lines.join("\n").slice(0, 4000));
}

export async function notifyDigest(
  stats: {
    newLeads: number;
    qualified: number;
    byCategory: { category: string; count: number }[];
  },
  topLeads: { title: string; company: string | null; score: number; url: string; source: string }[] = []
): Promise<boolean> {
  if (!hasTelegram()) return false;

  const lines = [
    "<b>📊 Xoppor AI Radar Digest</b>",
    "",
    `🔥 Qualified (70+ score): <b>${stats.qualified}</b>`,
    `📥 New opportunities today: <b>${stats.newLeads}</b>`,
  ];

  if (stats.byCategory.length > 0) {
    lines.push("", "<b>🗂 Hot by category:</b>");
    for (const { category, count } of stats.byCategory) {
      const cat = categories.find((c) => c.id === category);
      lines.push(`• ${cat ? `${cat.emoji} ${esc(cat.label)}` : esc(category)}: <b>${count}</b>`);
    }
  }

  if (topLeads.length > 0) {
    lines.push("", "<b>⭐ Top Opportunities:</b>");
    for (const l of topLeads) {
      lines.push(
        `• <b>[${l.score}]</b> ${esc(l.title.slice(0, 65))}\n  ${l.company ? `${esc(l.company)} · ` : ""}${l.source} → ${l.url}`
      );
    }
  }

  lines.push("", "<i>Open the dashboard to review the full archive.</i>");
  return send(lines.join("\n"));
}

export async function testTelegram(): Promise<string> {
  if (!hasTelegram()) return "not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)";
  const ok = await send("✅ Xoppor AI connected. You will receive opportunity alerts here.");
  return ok ? "connected" : "send failed — check token/chat id";
}
