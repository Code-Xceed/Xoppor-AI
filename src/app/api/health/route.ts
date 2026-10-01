/** GET /api/health — quick liveness + mode report. */

import { json } from "@/lib/api";
import { config, hasGemini, hasReddit, hasTelegram } from "@/lib/config";
import { SCOUTS } from "@/lib/scouts";

export async function GET() {
  return json({
    ok: true,
    authRequired: !!config.cronSecret,
    integrations: {
      gemini: hasGemini() ? "on" : "off (heuristic mode)",
      telegram: hasTelegram() ? "on" : "off",
      reddit: hasReddit() ? "on" : "off (public fallback)",
      scheduler: config.scheduler.enabled ? `on (${config.scheduler.scoutIntervalMinutes}m interval)` : "off",
      scouts: `${SCOUTS.length} active (${SCOUTS.map((s) => s.name).join(", ")})`,
    },
  });
}
