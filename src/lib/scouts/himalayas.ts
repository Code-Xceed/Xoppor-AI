/**
 * Himalayas scout — startup hiring, engineering roles, and remote contracts.
 * Official public RSS: https://himalayas.app/jobs/rss
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch } from "./filter";
import { parseRssItems } from "./rss";

export const himalayasScout: Scout = {
  name: "himalayas",
  async run() {
    const res = await safeFetch("https://himalayas.app/jobs/rss");
    if (!res || !res.ok) return [];

    const xml = await res.text();
    const items = parseRssItems(xml);
    const out: ScoutSignal[] = [];

    for (const item of items) {
      if (!matchesSkills(`${item.title} ${item.description}`)) continue;

      // URL pattern: https://himalayas.app/companies/{company}/jobs/{slug}
      const companyMatch = item.link.match(/companies\/([^/]+)/);
      const company = companyMatch
        ? companyMatch[1]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : undefined;

      const slug = item.link.split("/").filter(Boolean).pop() || item.link;

      out.push({
        source: "himalayas",
        externalId: slug,
        title: item.title.slice(0, 200),
        company: company?.slice(0, 120),
        description: clampText(item.description),
        url: item.link,
        location: "Remote",
        contactEmail: extractEmails(item.description)[0],
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }

    return out;
  },
};
