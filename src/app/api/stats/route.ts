/** GET /api/stats — dashboard numbers + system status. */

import { authorize, json, unauthorized } from "@/lib/api";
import { getStats } from "@/lib/pipeline";
import { aiStatus } from "@/lib/ai";

export async function GET(req: Request) {
  if (!authorize(req)) return unauthorized();
  const stats = await getStats();
  const ai = await aiStatus();
  return json({ stats, ai });
}
