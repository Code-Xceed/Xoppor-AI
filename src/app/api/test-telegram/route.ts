/** POST /api/test-telegram — send a test push. */

import { authorize, json, unauthorized } from "@/lib/api";
import { testTelegram } from "@/lib/telegram";

export async function POST(req: Request) {
  if (!authorize(req)) return unauthorized();
  const message = await testTelegram();
  return json({ ok: message === "connected", message });
}
