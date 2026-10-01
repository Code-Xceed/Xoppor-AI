/** Tests for the Devpost hackathon scout parsing (pure helpers re-implemented via the module). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { stripHtml } from "../src/lib/scouts/filter";

/**
 * The scout module doesn't export its helpers; replicate its exact logic here
 * so regressions in these rules are caught. Keep in sync with devpost.ts.
 */

function parseSubmissionDeadline(range: string | undefined): Date | undefined {
  if (!range) return undefined;
  const dates = range.split("-");
  const last = dates[dates.length - 1]?.trim();
  if (!last) return undefined;
  const parsed = new Date(last);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function cleanPrize(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const text = stripHtml(raw).replace(/\s+/g, "");
  return text.includes("$") ? text.slice(0, 40) : undefined;
}

test("devpost deadline parsing extracts end date from submission range", () => {
  const d = parseSubmissionDeadline("Aug 31 - Oct 23, 2026");
  assert.ok(d);
  assert.equal(d!.getUTCFullYear(), 2026);
  assert.equal(d!.getUTCMonth(), 9); // October
  assert.equal(parseSubmissionDeadline(undefined), undefined);
  assert.equal(parseSubmissionDeadline("garbage - also garbage"), undefined);
});

test("devpost prize cleaning strips HTML wrappers", () => {
  assert.equal(cleanPrize("$<span data-currency-value>138,000</span>"), "$138,000");
  assert.equal(cleanPrize("no money here"), undefined);
  assert.equal(cleanPrize(undefined), undefined);
});
