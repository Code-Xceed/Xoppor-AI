/** Tests for cross-source dedupe helpers (src/lib/dedupe.ts). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, similarTitle, isDuplicate, urlKey } from "../src/lib/dedupe";

test("normalizeUrl strips tracking params, www and trailing slashes", () => {
  assert.equal(
    normalizeUrl("https://jobs.example.com/role/123/?utm_source=remoteok&ref=tw"),
    "jobs.example.com/role/123"
  );
  assert.equal(
    normalizeUrl("https://www.Example.com/apply?utm_campaign=x&id=42"),
    "example.com/apply?id=42"
  );
});

test("normalizeUrl falls back to lowercase string for invalid URLs", () => {
  assert.equal(normalizeUrl("Not A URL"), "not a url");
});

test("similarTitle matches exact and containment variants", () => {
  assert.ok(similarTitle("Senior React Developer", "senior react developer"));
  assert.ok(similarTitle("Senior React Developer", "Senior React Developer (Remote)"));
  assert.ok(!similarTitle("Senior React Developer", "Junior Python Developer"));
});

test("similarTitle rejects short containment and empty titles", () => {
  // Short strings only match when exactly equal — containment needs 12+ chars,
  // so "Dev" must not match "DevOps Engineer".
  assert.ok(!similarTitle("Dev", "DevOps Engineer"));
  assert.ok(!similarTitle("", "anything"));
});

test("isDuplicate matches same canonical URL across boards", () => {
  assert.ok(
    isDuplicate(
      { title: "Backend Engineer", url: "https://acme.com/careers/9?utm_source=remoteok" },
      { title: "Senior Backend Engineer", url: "https://acme.com/careers/9" }
    )
  );
});

test("isDuplicate matches same company + similar title without URL match", () => {
  assert.ok(
    isDuplicate(
      { title: "Frontend Developer (Remote)", url: "https://boards.a.com/apply/1", company: "Globex" },
      { title: "Frontend Developer", url: "https://boards.b.com/job/999", company: "Globex" }
    )
  );
});

test("isDuplicate does not match different roles at the same company", () => {
  assert.ok(
    !isDuplicate(
      { title: "Frontend Developer", url: "https://boards.a.com/apply/1", company: "Globex" },
      { title: "Data Scientist", url: "https://boards.b.com/job/999", company: "Globex" }
    )
  );
});

test("isDuplicate does not match different companies with similar titles", () => {
  assert.ok(
    !isDuplicate(
      { title: "Frontend Developer", url: "https://boards.a.com/apply/1", company: "Globex" },
      { title: "Frontend Developer", url: "https://boards.b.com/job/999", company: "Initech" }
    )
  );
});

test("urlKey extracts a stable path fragment for DB pre-filtering", () => {
  assert.equal(urlKey("https://acme.com/careers/senior-dev-123?utm_source=x"), "acme.com/careers/senior-dev-123");
  assert.equal(urlKey("https://acme.com/"), null);
  assert.equal(urlKey("not a url"), null);
});
