/** Tests for the heuristic scoring engine. Pure functions — no network. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicScore } from "../src/lib/ai";

test("strong lead scores high", () => {
  const r = heuristicScore({
    title: "Hiring fullstack developer",
    description: "Funded startup needs a React/Next.js engineer for our SaaS platform. Remote, $120k salary, start ASAP.",
    company: "Acme",
  });
  assert.ok(r.score >= 70, `expected hot score, got ${r.score}`);
  assert.ok(r.matchedSkills.length > 0);
  assert.ok(r.signals.length > 0);
});

test("unpaid gigs get flagged down", () => {
  const good = heuristicScore({ title: "Need web developer", description: "React dashboard, budget $5000" });
  const bad = heuristicScore({ title: "Need web developer", description: "React dashboard, unpaid, for exposure, no budget" });
  assert.ok(bad.score < good.score, `expected ${bad.score} < ${good.score}`);
});

test("no skill overlap scores low", () => {
  const r = heuristicScore({ title: "Need a dentist", description: "Teeth cleaning services" });
  assert.ok(r.score < 35, `expected low score, got ${r.score}`);
});

test("category hint appears in heuristic reason", () => {
  const r = heuristicScore({ title: "AI hackathon weekend", description: "build with langchain, $50k prize", category: "hackathon" });
  assert.match(r.reason, /Hackathons/i);
  assert.ok(r.signals.some((s) => /prize/i.test(s)));
});
