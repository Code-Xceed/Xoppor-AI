/**
 * GitHub bounty scout — funded issues across open source (Algora-style bounties,
 * "💰 bounty" labels, paid contribution requests). Uses the free GitHub search API.
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, safeFetch } from "./filter";
import type { Category } from "../skills";

type GhIssue = {
  id?: number;
  number?: number;
  title?: string;
  html_url?: string;
  body?: string | null;
  created_at?: string;
  updated_at?: string;
  labels?: { name?: string }[];
  repository_url?: string; // https://api.github.com/repos/{owner}/{repo}
  user?: { login?: string };
};

type GhSearchResponse = { items?: GhIssue[] };

/** Queries for funded/paid open-source issues. */
const QUERIES = [
  "state:open type:issue label:bounty",
  "state:open type:issue Algora",
  "state:open type:issue label:💰 bounty",
];

function extractBounty(text: string): string | undefined {
  const m =
    text.match(/\$\s?([\d,]+)(?:\s?-\s?\$?\s?([\d,]+))?/) ??
    text.match(/(\d{2,6})\s?(?:USD|usd|dollars)/);
  if (!m) return undefined;
  const amount = m[0].replace(/\s+/g, " ").trim();
  return amount.length <= 40 ? amount : undefined;
}

function repoName(repositoryUrl: string | undefined): string | undefined {
  if (!repositoryUrl) return undefined;
  const m = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/);
  return m ? m[1] : undefined;
}

function toSignal(issue: GhIssue): ScoutSignal | null {
  if (!issue.id || !issue.title || !issue.html_url) return null;

  const repo = repoName(issue.repository_url);
  const text = `${issue.title} ${issue.body ?? ""} ${(issue.labels ?? [])
    .map((l) => l.name ?? "")
    .join(" ")}`;
  const bounty = extractBounty(text);

  return {
    source: "bounties",
    externalId: String(issue.id),
    category: "bounty" satisfies Category,
    title: issue.title.slice(0, 200),
    company: repo,
    description: clampText(issue.body ?? ""),
    url: issue.html_url,
    location: "Open source",
    budget: bounty,
    contactHandle: issue.user?.login,
    tags: (issue.labels ?? []).map((l) => l.name ?? "").filter(Boolean).slice(0, 8),
    postedAt: issue.created_at ? new Date(issue.created_at) : undefined,
  };
}

export const bountiesScout: Scout = {
  name: "bounties",
  async run() {
    const out: ScoutSignal[] = [];
    const seen = new Set<string>();

    for (const q of QUERIES) {
      const res = await safeFetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=40`
      );
      if (!res || !res.ok) continue;

      let data: GhSearchResponse;
      try {
        data = (await res.json()) as GhSearchResponse;
      } catch {
        continue;
      }

      for (const issue of data.items ?? []) {
        const signal = toSignal(issue);
        if (signal && !seen.has(signal.externalId)) {
          seen.add(signal.externalId);
          out.push(signal);
        }
      }
    }

    return out;
  },
};
