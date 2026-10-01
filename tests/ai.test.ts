/**
 * Tests for AI helpers. Run in isolation: GEMINI_API_KEY is cleared before the
 * module import so the heuristic (offline) paths are exercised deterministically.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

type Ai = typeof import("../src/lib/ai");

async function getAi(): Promise<Ai> {
  process.env.GEMINI_API_KEY = "";
  return import("../src/lib/ai");
}

test("extractJson parses plain JSON", async () => {
  const { extractJson } = await getAi();
  assert.deepEqual(extractJson<{ score: number }>('{"score": 90}'), { score: 90 });
});

test("extractJson strips markdown fences", async () => {
  const { extractJson } = await getAi();
  assert.deepEqual(extractJson<{ score: number }>("```json\n{\"score\": 90}\n```"), { score: 90 });
});

test("extractJson extracts object from surrounding prose", async () => {
  const { extractJson } = await getAi();
  const raw = 'Sure! Here you go: {"score": 90, "reason": "great match"} — hope that helps';
  assert.deepEqual(extractJson<{ score: number; reason: string }>(raw), { score: 90, reason: "great match" });
});

test("extractJson repairs unescaped newlines inside strings", async () => {
  const { extractJson } = await getAi();
  const raw = '{"score": 90, "reason": "line1\nline2"}';
  assert.deepEqual(extractJson<{ score: number; reason: string }>(raw), { score: 90, reason: "line1\nline2" });
});

test("extractJson returns null for garbage", async () => {
  const { extractJson } = await getAi();
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson(""), null);
});
