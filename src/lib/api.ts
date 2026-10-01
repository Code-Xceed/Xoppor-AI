/** Shared helpers for API route handlers. */

import { NextResponse } from "next/server";
import { config } from "./config";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "invalid or missing ?key= (CRON_SECRET set)" }, { status: 401 });
}

/** If CRON_SECRET is set, require ?key= or x-cron-key header to match. */
export function authorize(req: Request): boolean {
  if (!config.cronSecret) return true;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("x-cron-key");
  return key === config.cronSecret;
}
