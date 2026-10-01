/**
 * Internship scout — software / AI / data internships from the SimplifyJobs
 * community-maintained lists (Pitt CSC & Simplify). The README uses HTML
 * tables with one <tr> per role:
 *   <td>🔥 <strong><a href="company-url">Company</a></strong></td>
 *   <td>Role title</td>
 *   <td>Location (may be a <details> list)</td>
 *   <td><a href="apply-url">…Apply badge…</a> <a href="simplify-url">…</a></td>
 *   <td>0d</td>
 */

import type { Scout, ScoutSignal } from "./types";
import { clampText, safeFetch } from "./filter";
import type { Category } from "../skills";

const REPOS = [
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md",
];

type Row = {
  company: string;
  role: string;
  url: string;
  location: string;
};

/** Decode the handful of HTML entities GitHub embeds inside table cells. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Extract role rows from the README's HTML tables. The "Application" cell
 * contains 2+ links; the first non-Simplify one is the real careers-page URL.
 */
export function parseRows(html: string): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(html)) !== null) {
    const cells = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 3) continue;

    // Company: first <a href> inside the first cell (may carry a 🔥 prefix).
    const companyMatch = cells[0].match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!companyMatch) continue;
    const company = decodeEntities(companyMatch[2].replace(/<[^>]*>/g, "")).trim();
    if (!company) continue;

    // Role: plain text of the second cell.
    const role = decodeEntities(cells[1].replace(/<[^>]*>/g, "")).trim();
    if (!role) continue;

    // Location: plain text of the third cell (<details>/<br> flattened).
    const location = decodeEntities(cells[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();

    // Apply URL: prefer the first link in the Application cell that is not a
    // simplify.jobs tracking link (those come second as a "Simplify" badge).
    const links = [...cells[cells.length - 2].matchAll(/<a[^>]+href="([^"]+)"/gi)].map((l) => l[1]);
    const applyUrl = links.find((l) => !/simplify\.jobs|imgur\.com/i.test(l)) ?? links[0];
    if (!applyUrl || !/^https?:\/\//.test(applyUrl)) continue;

    const key = `${company}|${role}|${applyUrl}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push({ company, role, url: applyUrl.replace(/&amp;/g, "&"), location });
    }
  }

  return rows;
}

/** Keep only software / AI / data roles — skip quant, hardware and PM lists. */
function isTechRole(role: string): boolean {
  return /software|engineer|developer|data|machine learning|ml |ai |artificial intelligence|backend|frontend|full[- ]?stack|devops|cloud|platform|security|sre|ios|android|mobile/i.test(
    role
  );
}

function toSignal(row: Row, season: string): ScoutSignal {
  return {
    source: "internships",
    externalId: `${season}-${row.company.toLowerCase().replace(/\s+/g, "-")}-${row.role.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
    category: "internship" satisfies Category,
    title: `${row.company} — ${row.role}`,
    company: row.company.slice(0, 120),
    description: `${row.company} is hiring a ${row.role} (${season} internship). Location: ${row.location || "See listing"}. Apply via the company's careers page.`,
    url: row.url,
    location: clampText(row.location, 120) || "See listing",
    tags: [season.toLowerCase(), "internship"],
  };
}

export const internshipsScout: Scout = {
  name: "internships",
  async run() {
    const out: ScoutSignal[] = [];
    const seen = new Set<string>();

    for (const repoUrl of REPOS) {
      const seasonMatch = repoUrl.match(/\/(Summer\d{4})-/);
      const season = seasonMatch ? seasonMatch[1] : "Summer";

      const res = await safeFetch(repoUrl);
      if (!res || !res.ok) continue;

      const markdown = await res.text();
      const rows = parseRows(markdown.slice(0, 900_000));

      for (const row of rows) {
        if (!isTechRole(row.role)) continue;
        const signal = toSignal(row, season);
        if (!seen.has(signal.externalId)) {
          seen.add(signal.externalId);
          out.push(signal);
        }
      }
    }

    return out.slice(0, 300); // cap volume per run
  },
};
