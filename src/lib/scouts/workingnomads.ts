/**
 * Working Nomads scout — curated remote engineering & digital nomad positions.
 * Official public RSS: https://www.workingnomads.com/jobs/rss
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractBudget, extractEmails, matchesSkills, safeFetch } from "./filter";
import { parseRssItems } from "./rss";

export const workingNomadsScout: Scout = {
  name: "workingnomads",
  async run() {
    const res = await safeFetch("https://www.workingnomads.com/jobs/rss");
    if (!res || !res.ok) return [];

    const xml = await res.text();
    const items = parseRssItems(xml);
    const out: ScoutSignal[] = [];

    for (const item of items) {
      if (!matchesSkills(`${item.title} ${item.description}`)) continue;

      // Title format is typically "Position at  Company" or "Position at Company"
      const atIdx = item.title.lastIndexOf(" at ");
      const position = atIdx !== -1 ? item.title.slice(0, atIdx).trim() : item.title;
      const company = atIdx !== -1 ? item.title.slice(atIdx + 4).trim() : undefined;

      const slug = item.link.split("/").filter(Boolean).pop() || item.link;

      out.push({
        source: "workingnomads",
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
