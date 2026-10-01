/**
 * LaraJobs scout — remote developer, fullstack, backend, and engineering roles.
 * Official public RSS feed: https://larajobs.com/feed
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch, stripHtml } from "./filter";

function parseLaraJobsRss(xml: string): {
  title: string;
  link: string;
  company?: string;
  location?: string;
  salary?: string;
  tags?: string[];
  description: string;
  pubDate?: string;
}[] {
  const items: {
    title: string;
    link: string;
    company?: string;
    location?: string;
    salary?: string;
    tags?: string[];
    description: string;
    pubDate?: string;
  }[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const companyMatch = itemXml.match(/<job:company>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/job:company>/i);
    const locationMatch = itemXml.match(/<job:location>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/job:location>/i);
    const salaryMatch = itemXml.match(/<job:salary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/job:salary>/i);
    const tagsMatch = itemXml.match(/<job:tags>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/job:tags>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const dateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

    const title = (titleMatch ? titleMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const link = (linkMatch ? linkMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const company = (companyMatch ? companyMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const location = (locationMatch ? locationMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const salary = (salaryMatch ? salaryMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const rawTags = (tagsMatch ? tagsMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
    const rawDesc = (descMatch ? descMatch[1] : "").replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "");

    if (title && link) {
      items.push({
        title,
        link,
        company: company || undefined,
        location: location || "Remote",
        salary: salary || undefined,
        tags: rawTags ? rawTags.split(",").map((t) => t.trim()) : undefined,
        description: stripHtml(rawDesc) || title,
        pubDate: dateMatch ? dateMatch[1].trim() : undefined,
      });
    }
  }

  return items;
}

export const laraJobsScout: Scout = {
  name: "larajobs",
  async run() {
    const res = await safeFetch("https://larajobs.com/feed");
    if (!res || !res.ok) return [];

    const xml = await res.text();
    const items = parseLaraJobsRss(xml);
    const out: ScoutSignal[] = [];

    for (const item of items) {
      const tagStr = (item.tags ?? []).join(" ");
      if (!matchesSkills(`${item.title} ${item.description} ${tagStr}`)) continue;

      const slug = item.link.split("/").filter(Boolean).pop() || item.link;

      out.push({
        source: "larajobs",
        externalId: slug,
        title: item.title.slice(0, 200),
        company: item.company?.slice(0, 120),
        description: clampText(item.description),
        url: item.link,
        location: item.location?.slice(0, 120) || "Remote",
        budget: item.salary?.slice(0, 120),
        tags: item.tags?.slice(0, 15),
        contactEmail: extractEmails(item.description)[0],
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }

    return out;
  },
};
