/**
 * Minimal RSS <item> extractor shared by XML-based scouts.
 * Handles CDATA-wrapped values and basic HTML entities (via stripHtml downstream).
 */

import { stripHtml } from "./filter";

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
};

function unCdata(value: string): string {
  return value.replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
}

export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const dateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

    const title = unCdata(titleMatch ? titleMatch[1] : "");
    const link = unCdata(linkMatch ? linkMatch[1] : "");
    const rawDesc = unCdata(descMatch ? descMatch[1] : "");

    if (title && link) {
      items.push({
        title,
        link,
        description: stripHtml(rawDesc),
        pubDate: dateMatch ? unCdata(dateMatch[1]) : undefined,
      });
    }
  }

  return items;
}
