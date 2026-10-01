/**
 * WeWorkRemotely scout — official public RSS feeds.
 * https://weworkremotely.com
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch } from "./filter";
import { parseRssItems } from "./rss";

const FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/all-other-remote-jobs.rss",
];

export const weWorkRemotelyScout: Scout = {
  name: "weworkremotely",
  async run() {
    const out: ScoutSignal[] = [];
    const seen = new Set<string>();

    for (const feedUrl of FEEDS) {
      const res = await safeFetch(feedUrl);
      if (!res || !res.ok) continue;
      const xml = await res.text();
      const items = parseRssItems(xml);

      for (const item of items) {
        if (!matchesSkills(`${item.title} ${item.description}`)) continue;

        // WWR title format is typically "Company: Position"
        const colonIndex = item.title.indexOf(":");
        const company = colonIndex !== -1 ? item.title.slice(0, colonIndex).trim() : undefined;
        const position = colonIndex !== -1 ? item.title.slice(colonIndex + 1).trim() : item.title;

        // Generate stable externalId from url slug
        const slug = item.link.split("/").filter(Boolean).pop() || item.link;
        if (seen.has(slug)) continue;
        seen.add(slug);

        out.push({
          source: "weworkremotely",
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
    }

    return out;
  },
};
