/**
 * Hacker News scout — reads the latest monthly "Ask HN: Who is hiring?" thread
 * via the free Algolia HN Search API and extracts job posts (top-level comments).
 * No key required. https://hn.algolia.com/api
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch, stripHtml } from "./filter";

type HnHit = {
  objectID?: string;
  title?: string;
  story_title?: string;
};

type HnSearchResponse = { hits?: HnHit[] };

type HnItem = {
  id?: number;
  text?: string;
  created_at?: string;
  author?: string;
};

/** Pull the newest "Who is hiring" story id (first of each month). */
async function findLatestThreads(): Promise<{ id: string; title: string }[]> {
  const now = new Date();
  const threads: { id: string; title: string }[] = [];

  for (let back = 0; back < 2; back++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const year = d.getUTCFullYear();

    const queries = [
      `Ask HN: Who is hiring? (${month} ${year})`,
      `Ask HN: Freelancer? Seeking freelancer? (${month} ${year})`,
    ];

    for (const q of queries) {
      const res = await safeFetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story,ask_hn&hitsPerPage=1`
      );
      if (!res || !res.ok) continue;
      const data = (await res.json()) as HnSearchResponse;
      const hit = data.hits?.[0];
      if (hit?.objectID && !threads.some((t) => t.id === hit.objectID)) {
        threads.push({ id: hit.objectID, title: hit.title || q });
      }
    }
  }
  return threads;
}

/** Crude per-comment parser: first line = company, rest = the pitch. */
function parseComment(html: string): { company: string; description: string } {
  const text = stripHtml(html);
  const lines = text.split(/(?:\. | \|\s*)/).filter(Boolean);
  const company = (lines[0] ?? "Unknown").slice(0, 100).replace(/\s*\(.*$/, "").trim();
  return { company, description: clampText(text) };
}

export const hackerNewsScout: Scout = {
  name: "hackernews",
  async run() {
    const threads = await findLatestThreads();
    if (threads.length === 0) throw new Error("no Who-is-hiring or Freelancer threads found");

    const out: ScoutSignal[] = [];

    for (const thread of threads) {
      const res = await safeFetch(`https://hn.algolia.com/api/v1/items/${thread.id}`);
      if (!res || !res.ok) continue;

      const item = (await res.json()) as HnItem & { children?: HnItem[] };
      const comments = item.children ?? [];

      for (const c of comments.slice(0, 100)) {
        if (!c.id || !c.text) continue;
        const { company, description } = parseComment(c.text);
        const lower = description.toLowerCase();

        // Check if matches our expanded skills/contract keywords
        if (!matchesSkills(lower)) continue;

        // Skip pure on-site-only postings — our user is remote-first
        if (/on-?site only|must be located in|no remote/i.test(lower) && !/remote/i.test(lower)) continue;

        out.push({
          source: "hackernews",
          externalId: String(c.id),
          title: `${company} — ${thread.title.includes("Freelancer") ? "Freelance / Contract" : "Hiring"}`,
          company,
          description,
          url: `https://news.ycombinator.com/item?id=${c.id}`,
          location: /remote/i.test(lower) ? "Remote" : "Unspecified",
          contactHandle: c.author,
          contactEmail: extractEmails(c.text)[0],
          postedAt: c.created_at ? new Date(c.created_at) : undefined,
        });
      }
    }

    return out;
  },
};
