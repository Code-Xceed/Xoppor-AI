/**
 * Devpost scout — online & in-person hackathons with prize pools.
 * Official public JSON API: https://devpost.com/api/hackathons (no key required).
 */

import type { Scout, ScoutSignal } from "./types";
import { matchesSkills, safeFetch, stripHtml } from "./filter";
import type { Category } from "../skills";

type DevpostHackathon = {
  id?: number;
  title?: string;
  url?: string;
  open_state?: string;
  displayed_location?: { location?: string };
  submission_period_dates?: string;
  time_left_to_submission?: string;
  prize_amount?: string;
  registrations_count?: number;
  themes?: { name?: string }[];
  organization_name?: string | null;
  featured?: boolean;
};

type DevpostResponse = { hackathons?: DevpostHackathon[] };

/** "Aug 31 - Oct 23, 2026" → end date as Date (the submission deadline). */
function parseSubmissionDeadline(range: string | undefined): Date | undefined {
  if (!range) return undefined;
  const dates = range.split("-");
  const last = dates[dates.length - 1]?.trim();
  if (!last) return undefined;
  const parsed = new Date(last);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** '$<span data-currency-value>138,000</span>' → '$138,000' */
function cleanPrize(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const text = stripHtml(raw).replace(/\s+/g, "");
  return text.includes("$") ? text.slice(0, 40) : undefined;
}

function toSignal(h: DevpostHackathon): ScoutSignal | null {
  if (!h.id || !h.title || !h.url || h.open_state !== "open") return null;

  const themes = (h.themes ?? []).map((t) => t.name ?? "").filter(Boolean);
  const text = `${h.title} ${themes.join(" ")}`;

  return {
    source: "devpost",
    externalId: String(h.id),
    category: "hackathon" satisfies Category,
    title: h.title.slice(0, 200),
    company: h.organization_name?.slice(0, 120) ?? undefined,
    description: [
      h.submission_period_dates ? `Submission period: ${h.submission_period_dates}` : "",
      h.time_left_to_submission ? `Time left: ${h.time_left_to_submission}` : "",
      `${h.registrations_count ?? 0} participants registered`,
      themes.length ? `Themes: ${themes.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    url: h.url,
    location: h.displayed_location?.location?.slice(0, 120) ?? "Online",
    budget: cleanPrize(h.prize_amount),
    deadline: parseSubmissionDeadline(h.submission_period_dates),
    tags: themes.slice(0, 10),
  };
}

export const devpostScout: Scout = {
  name: "devpost",
  async run() {
    const res = await safeFetch("https://devpost.com/api/hackathons");
    if (!res || !res.ok) {
      throw new Error(`devpost fetch failed: ${res ? res.status : "no response"}`);
    }
    const data = (await res.json()) as DevpostResponse;
    const signals = (data.hackathons ?? [])
      .map(toSignal)
      .filter((s): s is ScoutSignal => s !== null);

    // Devpost volume is high — keep only hackathons whose themes/title touch our skills.
    return signals.filter((s) =>
      matchesSkills(`${s.title} ${(s.tags ?? []).join(" ")} ${s.description ?? ""}`)
    );
  },
};
