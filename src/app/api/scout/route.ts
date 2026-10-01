/** POST /api/scout — run the radar (scout → score → alert). Protected by CRON_SECRET when set. */

import { authorize, json, unauthorized } from "@/lib/api";
import { runScoring, runScouts } from "@/lib/pipeline";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (!authorize(req)) return unauthorized();

  const { results, newLeads } = await runScouts();
  const { scored, hot, alerted } = await runScoring();

  return json({ ok: true, newLeads, scored, hot, alerted, scouts: results });
}

export async function GET(req: NextRequest) {
  // Convenience for cron services that only do GET.
  return POST(req);
}
