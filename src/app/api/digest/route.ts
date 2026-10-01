/** POST /api/digest — send the daily Telegram digest. Protected by CRON_SECRET when set. */

import { authorize, json, unauthorized } from "@/lib/api";
import { runDigest } from "@/lib/pipeline";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (!authorize(req)) return unauthorized();
  const ok = await runDigest();
  return json({ ok });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
