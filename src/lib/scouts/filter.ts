/** Shared helpers for scouts: html stripping, keyword filtering, safe fetch. */

import { config } from "../config";
import { skillKeywords } from "../skills";

/** Built-in skill keywords + the user's own USER_KEYWORDS from .env. */
const ALL_SKILL_KEYWORDS = [...Object.values(skillKeywords).flat(), ...config.profile.extraKeywords];

export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clampText(text: string | undefined | null, max = 2000): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Returns true if the text mentions at least one skill keyword. */
export function matchesSkills(text: string): boolean {
  const lower = text.toLowerCase();
  return ALL_SKILL_KEYWORDS.some((k) => lower.includes(k));
}

/** fetch with timeout + browser-ish UA; returns null on any failure. */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(process.env.SCOUT_USER_AGENT ? { "User-Agent": process.env.SCOUT_USER_AGENT } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function daysAgo(date: Date | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const IGNORED_DOMAINS = new Set([
  "example.com",
  "domain.com",
  "test.com",
  "yourcompany.com",
  "sentry.io",
  "github.com",
  "w3.org",
  "schema.org",
  "cloudflare.com",
  "reactjs.org",
  "vercel.app",
  "npmjs.com",
  "remoteok.com",
  "remotive.com",
  "ycombinator.com",
]);

const IGNORED_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

/** Extract valid contact email addresses from free text / job descriptions. */
export function extractEmails(text: string | undefined | null): string[] {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) ?? [];
  const valid: string[] = [];

  for (let raw of matches) {
    raw = raw.replace(/[.,;:)>\]"']+$/, "").trim().toLowerCase();
    if (IGNORED_EXTS.some((ext) => raw.endsWith(ext))) continue;
    const parts = raw.split("@");
    if (parts.length !== 2) continue;
    const [local, host] = parts;
    if (!local || !host || host.length < 3) continue;
    if (IGNORED_DOMAINS.has(host)) continue;
    if (!valid.includes(raw)) valid.push(raw);
  }
  return valid;
}
