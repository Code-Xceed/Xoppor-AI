/**
 * Reddit scout — watches work-request subreddits via the official API.
 * Uses userless OAuth (REDDIT_CLIENT_ID/SECRET) when available. The public
 * fallback uses the `.rss` Atom endpoints with a browser User-Agent — plain
 * `.json` endpoints are blocked (HTTP 403) for unauthenticated scripts.
 */

import { hasReddit } from "../config";
import { redditExcludeKeywords, redditIncludeKeywords, subreddits } from "../skills";
import type { Scout, ScoutSignal } from "./types";
import { clampText, safeFetch } from "./filter";

const BROWSER_UA =
  process.env.SCOUT_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type RedditPost = {
  id: string;
  title: string;
  body: string;
  permalink: string;
  author?: string;
  subreddit?: string;
  createdAt?: Date;
};

type AtomEntry = {
  id?: string;
  title?: string;
  content?: string;
  link?: string;
  author?: string;
  category?: string;
  published?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  if (!hasReddit()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const basic = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await safeFetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&device_id=xoppor-ro",
  });
  if (!res || !res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Extract post fields from one Atom `<entry>` block. */
export function parseAtomEntry(entryXml: string): RedditPost | null {
  const idMatch = entryXml.match(/<id>t3_([^<]+)<\/id>/i);
  const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/i);
  const linkMatch = entryXml.match(/<link[^>]*href="([^"]+)"/i);
  const authorMatch = entryXml.match(/<author>[\s\S]*?<name>\/?u\/([^<]+)<\/name>/i);
  const categoryMatch = entryXml.match(/<category[^>]*term="([^"]+)"/i);
  const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/i);
  const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);

  if (!idMatch || !titleMatch || !linkMatch) return null;

  // Content is double-encoded HTML — decode entities, then strip tags.
  const rawContent = decodeEntities(contentMatch ? contentMatch[1] : "");
  const body = rawContent
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: idMatch[1],
    title: decodeEntities(titleMatch[1]).trim(),
    body,
    permalink: linkMatch[1],
    author: authorMatch ? authorMatch[1] : undefined,
    subreddit: categoryMatch ? categoryMatch[1] : undefined,
    createdAt: publishedMatch ? new Date(publishedMatch[1]) : undefined,
  };
}

/** Parse a reddit `.rss` Atom feed into posts. */
export function parseAtomFeed(xml: string): RedditPost[] {
  const posts: RedditPost[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;

  while ((m = entryRegex.exec(xml)) !== null) {
    const post = parseAtomEntry(m[1]);
    if (post) posts.push(post);
  }
  return posts;
}

function toSignal(post: RedditPost): ScoutSignal | null {
  const title = post.title;
  if (!title) return null;
  const text = `${title} ${post.body}`.toLowerCase();

  const isBuyer = redditIncludeKeywords.some((k) => text.includes(k));
  const isSeller = redditExcludeKeywords.some((k) => text.includes(k));
  if (!isBuyer || isSeller) return null;

  return {
    source: "reddit",
    externalId: post.id,
    title: title.slice(0, 200),
    company: post.author ? `u/${post.author}` : undefined,
    description: clampText(post.body),
    url: post.permalink,
    location: post.subreddit ? `r/${post.subreddit}` : undefined,
    contactHandle: post.author,
    postedAt: post.createdAt,
  };
}

async function fetchSub(sub: string, token: string | null): Promise<RedditPost[]> {
  if (token) {
    const res = await safeFetch(`https://oauth.reddit.com/r/${sub}/new?limit=25`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res && res.ok) {
      try {
        const data = (await res.json()) as {
          data?: { children?: { data?: { id?: string; title?: string; selftext?: string; permalink?: string; author?: string; created_utc?: number; subreddit?: string } }[] };
        };
        return (data.data?.children ?? [])
          .map((c) => c.data ?? {})
          .filter((p) => p.id && p.title && p.permalink)
          .map((p) => ({
            id: p.id as string,
            title: p.title as string,
            body: (p.selftext ?? "").replace(/\s+/g, " ").trim(),
            permalink: `https://www.reddit.com${p.permalink}`,
            author: p.author,
            subreddit: p.subreddit ?? sub,
            createdAt: p.created_utc ? new Date(p.created_utc * 1000) : undefined,
          }));
      } catch {
        /* fall through to rss */
      }
    }
  }

  // Public fallback — Atom feed with a browser User-Agent.
  const res = await safeFetch(`https://www.reddit.com/r/${sub}/new/.rss?limit=25`, {
    headers: { "User-Agent": BROWSER_UA, Accept: "application/rss+xml" },
  });
  if (!res || !res.ok) return [];
  try {
    return parseAtomFeed(await res.text());
  } catch {
    return [];
  }
}

export const redditScout: Scout = {
  name: "reddit",
  async run() {
    const token = await getAppToken();
    if (!token) {
      // Public Atom fallback — no creds needed; may be rate-limited.
      console.warn("[reddit] no OAuth creds — using public .rss fallback");
    }
    const results = await Promise.all(subreddits.map((s) => fetchSub(s, token)));
    return results.flat().map(toSignal).filter((s): s is ScoutSignal => s !== null);
  },
};
