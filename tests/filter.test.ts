/** Tests for scout text/filter helpers. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { clampText, extractEmails, matchesSkills, stripHtml } from "../src/lib/scouts/filter";

test("stripHtml removes tags, CDATA and entities", () => {
  assert.equal(stripHtml("<![CDATA[<b>Hello</b> &amp; welcome]]>"), "Hello & welcome");
});

test("stripHtml collapses whitespace", () => {
  assert.equal(stripHtml("<p>Line one</p>\n<p>   Line two</p>"), "Line one Line two");
});

test("clampText collapses whitespace and truncates with ellipsis", () => {
  assert.equal(clampText("  a   b  "), "a b");
  const long = clampText("x".repeat(50), 10);
  assert.equal(long.length, 11);
  assert.ok(long.endsWith("…"));
});

test("matchesSkills detects skill keywords", () => {
  assert.equal(matchesSkills("Need a Next.js developer for a SaaS MVP"), true);
  assert.equal(matchesSkills("Looking for a plumber"), false);
});

test("extractEmails filters junk domains, images and trailing punctuation", () => {
  // example.com / github.com / image files are deliberately filtered as junk.
  const emails = extractEmails("Contact bob@Example.com, fake@github.com, img@x.png, or jane@acme.io.");
  assert.deepEqual(emails, ["jane@acme.io"]);
});

test("extractEmails returns empty for no input", () => {
  assert.deepEqual(extractEmails(undefined), []);
  assert.deepEqual(extractEmails("no emails here"), []);
});
