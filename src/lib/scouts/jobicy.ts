/**
 * Jobicy scout — remote jobs, freelance contracts, and engineering gigs.
 * Official public RSS: https://jobicy.com/?feed=job_feed
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractBudget, extractEmails, matchesSkills, safeFetch } from "./filter";
import { parseRssItems } from "./rss";

export const jobicyScout: Scout = {
  name: "jobicy",
  async run() {
    const res = await safeFetch("https://jobicy.com/?feed=job_feed");
    if (!res || !res.ok) return [];

    const xml = await res.text();
    const items = parseRssItems(xml);
    const out: ScoutSignal[] = [];

    for (const item of items) {
      if (!matchesSkills(`${item.title} ${item.description}`)) continue;

      const atIdx = item.title.lastIndexOf(" at ");
      const position = atIdx !== -1 ? item.title.slice(0, atIdx).trim() : item.title;
      const company = atIdx !== -1 ? item.title.slice(atIdx + 4).trim() : undefined;

      const slug = item.link.split("/").filter(Boolean).pop() || item.link;

      out.push({
        source: "jobicy",
        externalId: slug,
        title: position.slice(0, 200),
        company: company?.slice(0, 120),
        description: clampText(item.description),
        budget: extractBudget(`${item.title} ${item.description}`),
        url: item.link,
        location: "Remote",
        contactEmail: extractEmails(item.description)[0],
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }

    return out;
  },
};
