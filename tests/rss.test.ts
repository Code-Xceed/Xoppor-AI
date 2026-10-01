/** Tests for the shared RSS parser used by XML-based scouts. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRssItems } from "../src/lib/scouts/rss";
import { parseAtomFeed } from "../src/lib/scouts/reddit";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss><channel>
<item><title><![CDATA[Senior React Dev]]></title><link>https://example.com/jobs/1</link><description><![CDATA[<p>Remote &amp; funded</p>]]></description><pubDate>Tue, 29 Sep 2026 10:00:00 GMT</pubDate></item>
<item><title>Node Engineer</title><link>https://example.com/jobs/2</link><description>API work</description></item>
<item><title>Broken item</title><description>missing link should be skipped</description></item>
</channel></rss>`;

test("parseRssItems extracts titles, links, cleaned descriptions and dates", () => {
  const items = parseRssItems(SAMPLE);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Senior React Dev");
  assert.equal(items[0].link, "https://example.com/jobs/1");
  assert.equal(items[0].description, "Remote & funded");
  assert.equal(items[0].pubDate, "Tue, 29 Sep 2026 10:00:00 GMT");
  assert.equal(items[1].title, "Node Engineer");
  assert.equal(items[1].pubDate, undefined);
});

test("parseRssItems returns empty array for non-RSS input", () => {
  assert.deepEqual(parseRssItems("<html><body>not rss</body></html>"), []);
});

const ATOM_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry><author><name>/u/alice</name><uri>https://www.reddit.com/user/alice</uri></author><category term="forhire" label="r/forhire"/><content type="html">&amp;lt;p&amp;gt;We are &amp;lt;strong&amp;gt;hiring a developer&amp;lt;/strong&amp;gt; for a SaaS dashboard.&amp;lt;/p&amp;gt;</content><id>t3_abc123</id><link href="https://www.reddit.com/r/forhire/comments/abc123/post_one/" /><updated>2026-10-01T15:36:17+00:00</updated><published>2026-10-01T15:36:17+00:00</published><title>[Hiring] Fullstack dev for SaaS MVP</title></entry>
<entry><content type="html">missing id and link</content><title>Broken entry</title></entry>
</feed>`;

test("parseAtomFeed extracts reddit posts from .rss Atom entries", () => {
  const posts = parseAtomFeed(ATOM_SAMPLE);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, "abc123");
  assert.equal(posts[0].title, "[Hiring] Fullstack dev for SaaS MVP");
  assert.equal(posts[0].permalink, "https://www.reddit.com/r/forhire/comments/abc123/post_one/");
  assert.equal(posts[0].author, "alice");
  assert.equal(posts[0].subreddit, "forhire");
  // Double-encoded HTML gets decoded then stripped to plain text.
  assert.ok(posts[0].body.includes("hiring a developer"));
  assert.ok(posts[0].body.includes("SaaS dashboard"));
});

test("parseAtomFeed returns empty array for non-Atom input", () => {
  assert.deepEqual(parseAtomFeed("<rss><channel></channel></rss>"), []);
});
