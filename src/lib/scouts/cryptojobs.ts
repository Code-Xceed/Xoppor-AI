/**
 * CryptoJobsList scout — Web3, AI, and remote software engineering opportunities.
 * Official public RSS feed: https://cryptojobslist.com/feed.xml
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch } from "./filter";
import { parseRssItems } from "./rss";

export const cryptoJobsScout: Scout = {
  name: "cryptojobs",
  async run() {
    const res = await safeFetch("https://cryptojobslist.com/feed.xml");
    if (!res || !res.ok) return [];

    const xml = await res.text();
    const items = parseRssItems(xml);
    const out: ScoutSignal[] = [];

    for (const item of items) {
      if (!matchesSkills(`${item.title} ${item.description}`)) continue;

      // Extract company if title contains "at Company"
      const atIdx = item.title.lastIndexOf(" at ");
      const position = atIdx !== -1 ? item.title.slice(0, atIdx).trim() : item.title;
      const company = atIdx !== -1 ? item.title.slice(atIdx + 4).trim() : undefined;

      const slug = item.link.split("/").filter(Boolean).pop() || item.link;

      out.push({
        source: "cryptojobs",
        externalId: slug,
        title: position.slice(0, 200),
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
