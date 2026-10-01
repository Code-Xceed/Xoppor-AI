/**
 * Cross-source dedupe — the same opportunity often shows up on several boards
 * (RemoteOK + WeWorkRemotely + Himalayas). Pure logic lives here; the DB
 * lookup that uses it lives in the pipeline. Everything is exported so tests
 * can exercise it directly.
 */

/** Tracking params that boards append — strip them so URLs compare equal. */
const TRACKING_PARAM = /^(utm_|ref$|ref_|source$|referrer$|trk|mch|gh_src)/i;

/**
 * Canonical form of a job URL: lowercase host (no www), tracking params
 * stripped, no trailing slash, no fragment. Two boards linking the same
 * posting usually normalize to the same string.
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const params = new URLSearchParams(u.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAM.test(key)) params.delete(key);
    }
    const path = u.pathname.replace(/\/+$/, "");
    const query = params.toString();
    return `${host}${path}${query ? `?${query}` : ""}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Reduce a title to comparable words: lowercase, alphanumeric + spaces. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when two titles refer to the same role. Exact match, or one contains
 * the other (min 12 chars) — handles "Senior Dev" vs "Senior Developer
 * (Remote)" style variations between boards.
 */
export function similarTitle(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 12 && nb.includes(na)) return true;
  if (nb.length >= 12 && na.includes(nb)) return true;
  return false;
}

function sameCompany(a?: string | null, b?: string | null): boolean {
  const na = (a ?? "").trim().toLowerCase();
  const nb = (b ?? "").trim().toLowerCase();
  return na.length > 1 && na === nb;
}

/** Distinctive path fragment of a URL, used as a cheap pre-filter in queries. */
export function urlKey(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const key = `${u.hostname.toLowerCase().replace(/^www\./, "")}/${segments.slice(-2).join("/")}`;
    return key.length >= 10 ? key : null;
  } catch {
    return null;
  }
}

export type DedupeCandidate = {
  title: string;
  url: string;
  company?: string | null;
};

/**
 * Confirm a duplicate: same canonical URL, or same company + similar title.
 * Never matches two different postings from one company (title check guards).
 */
export function isDuplicate(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) return true;
  return sameCompany(a.company, b.company) && similarTitle(a.title, b.title);
}
