/**
 * Arbeitnow scout — remote tech jobs, engineering contracts, and modern roles.
 * Official public JSON API: https://www.arbeitnow.com/api/job-board-api
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, extractEmails, matchesSkills, safeFetch, stripHtml } from "./filter";

type ArbeitnowItem = {
  slug: string;
  company_name?: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

type ArbeitnowResponse = {
  data?: ArbeitnowItem[];
};

export const arbeitnowScout: Scout = {
  name: "arbeitnow",
  async run() {
    const res = await safeFetch("https://www.arbeitnow.com/api/job-board-api");
    if (!res || !res.ok) return [];

    const json = (await res.json()) as ArbeitnowResponse;
    const items = json.data || [];
    const out: ScoutSignal[] = [];

    for (const item of items) {
      if (!item.title || !item.url) continue;

      const rawDesc = item.description || "";
      const textDesc = stripHtml(rawDesc);
      const tagStr = (item.tags || []).join(" ");

      if (!matchesSkills(`${item.title} ${textDesc} ${tagStr}`)) continue;

      const emails = extractEmails(textDesc);

      out.push({
        source: "arbeitnow",
        externalId: item.slug || item.url,
        title: item.title.slice(0, 200),
        company: item.company_name?.slice(0, 120) || undefined,
        description: clampText(textDesc),
        url: item.url,
        location: item.remote ? "Remote" : item.location || "Remote",
        tags: item.tags?.slice(0, 15) || [],
        contactEmail: emails[0],
        postedAt: item.created_at ? new Date(item.created_at * 1000) : undefined,
      });
    }

    return out;
  },
};
