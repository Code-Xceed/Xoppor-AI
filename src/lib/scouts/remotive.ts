/** Remotive scout — official public API: https://remotive.com/api/remote-jobs */

import type { Scout, ScoutSignal } from "./types";
import { clampText, matchesSkills, safeFetch, stripHtml } from "./filter";

type RemotiveJob = {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  created_at?: string;
  tags?: string[];
};

export const remotiveScout: Scout = {
  name: "remotive",
  async run() {
    const res = await safeFetch("https://remotive.com/api/remote-jobs?limit=100");
    if (!res || !res.ok) {
      throw new Error(`remotive fetch failed: ${res ? res.status : "no response"}`);
    }
    const data = (await res.json()) as { jobs?: RemotiveJob[] };
    const out: ScoutSignal[] = [];

    for (const job of data.jobs ?? []) {
      if (!job.id || !job.url || !job.title) continue;
      const description = stripHtml(job.description);
      const text = `${job.title} ${description} ${(job.tags ?? []).join(" ")} ${job.category ?? ""}`;
      if (!matchesSkills(text)) continue;

      out.push({
        source: "remotive",
        externalId: String(job.id),
        title: job.title.slice(0, 200),
        company: job.company_name?.slice(0, 120),
        description: clampText(description),
        url: job.url,
        location: job.candidate_required_location?.slice(0, 120) || "Remote",
        budget: job.salary?.slice(0, 120),
        tags: job.tags?.slice(0, 15),
        postedAt: job.created_at ? new Date(job.created_at) : undefined,
      });
    }
    return out;
  },
};
