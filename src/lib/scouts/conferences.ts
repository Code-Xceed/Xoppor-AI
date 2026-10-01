/**
 * Tech-conference scout — developer conferences & events from the
 * tech-conferences/conference-data open dataset (JSON per topic per year).
 * Includes CFP (call-for-papers/speakers) deadlines when published.
 */

import type { Scout, ScoutSignal } from "./types";
import { safeFetch } from "./filter";
import { conferenceTopics, skillKeywords } from "../skills";
import type { Category } from "../skills";

type Conference = {
  name?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  city?: string;
  country?: string;
  online?: boolean;
  cfpUrl?: string;
  cfpEndDate?: string;
};

function toSignal(c: Conference, topic: string, year: number): ScoutSignal | null {
  if (!c.name || !c.url || !c.startDate) return null;

  const start = new Date(c.startDate);
  if (Number.isNaN(start.getTime())) return null;

  const isCfp = !!c.cfpEndDate && new Date(c.cfpEndDate) > new Date();
  const text = `${c.name} ${topic}`;

  const skillsMentioned = Object.entries(skillKeywords)
    .filter(([skill, words]) => words.some((w) => text.toLowerCase().includes(w)))
    .map(([skill]) => skill);

  return {
    source: "conferences",
    externalId: `${year}-${topic}-${c.name.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}`,
    category: "event" satisfies Category,
    title: isCfp ? `CFP open: ${c.name} (${c.startDate})` : c.name.slice(0, 200),
    company: undefined,
    description: [
      `Tech conference · topic: ${topic}`,
      c.city || c.country ? `Location: ${[c.city, c.country].filter(Boolean).join(", ")}` : "",
      c.online ? "Online participation available" : "",
      isCfp && c.cfpEndDate ? `CFP deadline: ${c.cfpEndDate}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    url: c.cfpUrl || c.url,
    location: c.online ? "Online" : [c.city, c.country].filter(Boolean).join(", ") || "In person",
    budget: undefined,
    deadline: isCfp && c.cfpEndDate ? new Date(c.cfpEndDate) : start,
    tags: [topic, ...(skillsMentioned.length ? [`skills: ${skillsMentioned.join("/")}`] : [])].slice(0, 5),
  };
}

export const conferencesScout: Scout = {
  name: "conferences",
  async run() {
    const year = new Date().getUTCFullYear() + (new Date().getUTCMonth() >= 10 ? 1 : 0);
    const out: ScoutSignal[] = [];
    const seen = new Set<string>();

    for (const topic of conferenceTopics) {
      const res = await safeFetch(
        `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`
      );
      if (!res || !res.ok) continue;

      let items: Conference[];
      try {
        items = (await res.json()) as Conference[];
      } catch {
        continue;
      }

      for (const c of items) {
        const signal = toSignal(c, topic, year);
        if (signal && !seen.has(signal.externalId)) {
          seen.add(signal.externalId);
          out.push(signal);
        }
      }
    }

    return out;
  },
};
