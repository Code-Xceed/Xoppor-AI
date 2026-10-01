/**
 * AI engine: Gemini for scoring, with a deterministic heuristic
 * fallback so the radar always works — with or without an API key.
 */

import { config, hasGemini } from "./config";
import { createLogger } from "./logger";
import { categories, redFlags, signalKeywords, skillKeywords, type Category } from "./skills";

const log = createLogger("ai");

// ── Gemini REST client ──────────────────────────────────────────────────────

type GeminiPart = { text?: string };
type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

/**
 * Models to try, in order. New API keys can no longer access the retired
 * gemini-2.5 family (verified Sep 2026), so we start with the rolling
 * "latest" alias and fall back to Gemma open models, which share the same API.
 */
function modelCandidates(): string[] {
  const primary = config.gemini.model;
  const fallbacks = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

let resolvedModel: string | null = null;

async function callModel(
  model: string,
  prompt: string,
  timeoutMs: number
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const url = `${config.gemini.baseUrl}/models/${model}:generateContent?key=${config.gemini.apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if (res.status === 404 || res.status === 400) {
        log.warn(`model ${model} unavailable (${res.status}), trying fallback`);
      } else {
        log.warn("gemini http error", { model, status: res.status, body });
      }
      return { ok: false, status: res.status };
    }
    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) return { ok: false, status: 200 };
    return { ok: true, text: text.trim() };
  } catch (err) {
    log.warn("gemini call failed", err instanceof Error ? err.message : err);
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Circuit breaker: a model that fails twice in a row (503/429/timeout — typical
 * free-tier "high demand") goes on a 1-minute cooldown. During outages calls
 * fail fast to the next model, then to the heuristic, instead of stalling.
 */
const modelHealth = new Map<string, { failures: number; cooldownUntil: number }>();
const COOLDOWN_MS = 60_000;

function isCoolingDown(model: string): boolean {
  const h = modelHealth.get(model);
  return !!h && h.cooldownUntil > Date.now();
}

function recordFailure(model: string) {
  const h = modelHealth.get(model) ?? { failures: 0, cooldownUntil: 0 };
  h.failures += 1;
  if (h.failures >= 2) {
    h.cooldownUntil = Date.now() + COOLDOWN_MS;
    h.failures = 0;
    log.warn(`model ${model} on ${COOLDOWN_MS / 1000}s cooldown`);
  }
  modelHealth.set(model, h);
  if (model === resolvedModel) resolvedModel = null; // force re-resolution next call
}

function recordSuccess(model: string) {
  modelHealth.set(model, { failures: 0, cooldownUntil: 0 });
  resolvedModel = model;
}

async function gemini(prompt: string, timeoutMs = 30_000): Promise<string | null> {
  if (!hasGemini()) return null;
  const candidates = modelCandidates();
  // Prefer the sticky resolved model when healthy; skip cooling-down models.
  const ordered =
    resolvedModel && !isCoolingDown(resolvedModel) && candidates.includes(resolvedModel)
      ? [resolvedModel, ...candidates.filter((m) => m !== resolvedModel)]
      : candidates;
  const models = ordered.filter((m) => !isCoolingDown(m));
  if (models.length === 0) return null; // everything cooling down → fail fast to heuristic

  for (const model of models) {
    const result = await callModel(model, prompt, timeoutMs);
    if (result.ok) {
      recordSuccess(model);
      return result.text;
    }
    if (result.status === 503 || result.status === 429 || result.status === 0) {
      recordFailure(model);
      continue; // try the next candidate immediately
    }
    if (result.status === 404 || result.status === 400) {
      recordFailure(model);
      recordFailure(model); // retired models go straight to cooldown
      continue;
    }
    break; // 401/403/500: key or server problem — other models won't help
  }
  return null;
}

// ── Shared types ────────────────────────────────────────────────────────────

export type ScoreResult = {
  score: number;
  reason: string;
  matchedSkills: string[];
  signals: string[];
  engine: "gemini" | "heuristic";
};

// ── Heuristic scorer (fallback + fast path) ────────────────────────────────

function haystack(lead: { title: string; description?: string | null; company?: string | null; tags?: string | null }): string {
  const tags = lead.tags ? lead.tags.toLowerCase() : "";
  return `${lead.title}\n${lead.description ?? ""}\n${lead.company ?? ""}\n${tags}`.toLowerCase();
}

function matchSkills(text: string): string[] {
  const matched: string[] = [];
  for (const [skill, words] of Object.entries(skillKeywords)) {
    if (words.some((w) => text.includes(w))) matched.push(skill);
  }
  return matched;
}

function matchSignals(text: string): string[] {
  const found: string[] = [];
  for (const sig of signalKeywords) {
    if (sig.words.some((w) => text.includes(w))) found.push(sig.label);
  }
  return found;
}

export function heuristicScore(lead: {
  title: string;
  description?: string | null;
  company?: string | null;
  tags?: string | null;
  category?: Category | string;
}): ScoreResult {
  const text = haystack(lead);
  const matchedSkills = matchSkills(text);
  const signals = matchSignals(text);

  let score = 20;
  score += matchedSkills.length * 12;
  for (const sig of signalKeywords) {
    if (signals.includes(sig.label)) score += sig.weight;
  }
  for (const flag of redFlags) {
    if (flag.words.some((w) => text.includes(w))) score -= flag.weight;
  }
  if (matchedSkills.length === 0) score -= 25;
  score = Math.max(0, Math.min(100, score));

  const categoryLabel = categories.find((c) => c.id === lead.category)?.label;
  const reason =
    matchedSkills.length === 0
      ? "No skill overlap detected in text."
      : `Matches: ${matchedSkills.join(", ")}${signals.length ? ` · signals: ${signals.join(", ")}` : ""}${categoryLabel ? ` · ${categoryLabel}` : ""}`;

  return { score, reason, matchedSkills, signals, engine: "heuristic" };
}

// ── Gemini scorer ───────────────────────────────────────────────────────────

const CATEGORY_IDS = categories.map((c) => c.id).join("|");

const SCORE_PROMPT = `You are an AI Opportunity Radar scouting the web for the user. It finds: jobs, freelance/contract work, internships, hackathons, tech conferences/events, and paid bounties matching these skills: ${[...Object.keys(skillKeywords), ...config.profile.extraKeywords].join(", ")}.
User Profile: ${config.profile.title} (${config.profile.bio}).
Important: Judge compensation fairly — do NOT penalize an opportunity for being full-time or salaried, and treat clearly-stated budgets/prizes as a strong positive signal.

Given the OPPORTUNITY below, reply with ONLY compact JSON (no markdown fences, no formatting):
{"score": <0-100 integer>, "reason": "<one concise sentence explaining why this is or isn't a great opportunity>", "matchedSkills": ["..."], "signals": ["buying/urgency/budget signals seen"], "category": "<one of: ${CATEGORY_IDS}>"}

Scoring Guide:
• 85–100: Exceptional match — clear budget/compensation or big prize pool, direct skill alignment (AI, fullstack, web, apps), urgent deadline, or well-funded organizer/client.
• 70–84: Strong opportunity — good skill overlap, verified opening/event/contract, legitimate company/client.
• 45–69: Moderate match — some skill overlap or vague requirements.
• 0–44: Poor match — unpaid, equity-only, on-site required, or completely unrelated domain.

OPPORTUNITY:
Title: {TITLE}
Company: {COMPANY}
Category hint: {CATEGORY}
Description: {DESCRIPTION}
Tags: {TAGS}
Source: {SOURCE}`;

export function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  let clean = raw.trim();
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) clean = fence[1].trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = clean.slice(start, end + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch {
    try {
      // Fix unescaped newlines/tabs inside string values
      const sanitized = candidate.replace(/"((?:\\.|[^"\\])*)"/g, (_, str: string) => {
        return '"' + str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
      });
      return JSON.parse(sanitized) as T;
    } catch {
      return null;
    }
  }
}

export async function scoreLead(lead: {
  title: string;
  description?: string | null;
  company?: string | null;
  tags?: string | null;
  source: string;
  category?: Category | string;
}): Promise<ScoreResult> {
  const fallback = heuristicScore(lead);
  if (!hasGemini()) return fallback;

  const prompt = SCORE_PROMPT.replace("{TITLE}", lead.title.slice(0, 300))
    .replace("{COMPANY}", (lead.company ?? "unknown").slice(0, 120))
    .replace("{CATEGORY}", String(lead.category ?? "job"))
    .replace("{DESCRIPTION}", (lead.description ?? "").replace(/\s+/g, " ").slice(0, 2500))
    .replace("{TAGS}", (lead.tags ?? "").slice(0, 200))
    .replace("{SOURCE}", lead.source);

  const raw = await gemini(prompt);
  if (!raw) return fallback;

  const parsed = extractJson<Partial<ScoreResult & { category: string }>>(raw);
  if (!parsed) {
    log.warn("failed to parse gemini score json, using heuristic");
    return fallback;
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? fallback.score))));
  const matchedSkills = Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills.slice(0, 8) : fallback.matchedSkills;
  const signals = Array.isArray(parsed.signals) ? parsed.signals.slice(0, 8) : fallback.signals;

  return {
    score,
    reason: String(parsed.reason ?? fallback.reason).slice(0, 500),
    matchedSkills,
    signals,
    engine: "gemini",
  };
}

/** Test the AI connection. Returns a short status string (cached 5 min). */
let statusCache: { value: string; at: number } | null = null;

export async function aiStatus(): Promise<string> {
  if (!hasGemini()) return "heuristic mode (no GEMINI_API_KEY)";
  if (statusCache && Date.now() - statusCache.at < 300_000) return statusCache.value;
  const out = await gemini('Reply with exactly: OK');
  const value = out ? `gemini:${resolvedModel ?? config.gemini.model} connected` : "gemini unreachable — heuristic mode";
  statusCache = { value, at: Date.now() };
  return value;
}
