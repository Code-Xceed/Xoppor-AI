/** RemoteOK scout — official public JSON feed: https://remoteok.com/api */

import type { Scout, ScoutSignal } from "./types";
import { clampText, matchesSkills, safeFetch, stripHtml } from "./filter";

type RemoteOkJob = {
  id?: number | string;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  date?: string;
  tags?: string[];
  url?: string;
  salary_min?: number;
  salary_max?: number;
  legal?: string;
};

function toSignal(job: RemoteOkJob): ScoutSignal | null {
  if (!job.id || !job.position || !job.url) return null;
  const description = stripHtml(job.description);
  // Keep only leads that touch our skills — RemoteOK volume is too high otherwise.
  if (!matchesSkills(`${job.position} ${description} ${(job.tags ?? []).join(" ")}`)) return null;

  const budget =
    job.salary_min && job.salary_max ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k/yr` : undefined;

  return {
    source: "remoteok",
    externalId: String(job.id),
    title: job.position.slice(0, 200),
    company: job.company?.slice(0, 120),
    description: clampText(description),
    url: job.url.startsWith("http") ? job.url : `https://remoteok.com${job.url}`,
    location: job.location?.slice(0, 120) || "Remote",
    budget,
    tags: job.tags?.slice(0, 15),
    postedAt: job.date ? new Date(job.date) : undefined,
  };
}

export const remoteOkScout: Scout = {
  name: "remoteok",
  async run() {
    const res = await safeFetch("https://remoteok.com/api");
    if (!res || !res.ok) {
      throw new Error(`remoteok fetch failed: ${res ? res.status : "no response"}`);
    }
    const data = (await res.json()) as RemoteOkJob[];
    // First element is metadata; the rest are jobs.
    return data
      .slice(1)
      .slice(0, 120)
      .map(toSignal)
      .filter((s): s is ScoutSignal => s !== null);
  },
};
