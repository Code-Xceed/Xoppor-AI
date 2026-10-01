/**
 * In-process scheduler — runs the pipeline automatically while the Next.js
 * server is up. Enable with SCHEDULER_ENABLED=true (works with `npm start`).
 * For 24/7 operation without keeping your PC on, use the GitHub Actions cron
 * (see .github/workflows/cron.yml) hitting /api/scout instead.
 */

import { config } from "./config";
import { createLogger } from "./logger";
import { runDigest, runScoring, runScouts } from "./pipeline";

const log = createLogger("scheduler");

let started = false;
let scoutTimer: ReturnType<typeof setInterval> | null = null;
let digestCheck: ReturnType<typeof setInterval> | null = null;
let lastDigestDay = "";

async function fullRun() {
  try {
    const { newLeads } = await runScouts();
    const { scored, hot, alerted } = await runScoring();
    log.info(`cycle done: ${newLeads} new, ${scored} scored (${hot} hot, ${alerted} alerted)`);
  } catch (err) {
    log.error("cycle failed", err instanceof Error ? err.message : err);
  }
}

export function startScheduler() {
  if (started || !config.scheduler.enabled) return;
  started = true;

  const intervalMs = Math.max(5, config.scheduler.scoutIntervalMinutes) * 60_000;
  scoutTimer = setInterval(fullRun, intervalMs);
  log.info(`scout cycle every ${config.scheduler.scoutIntervalMinutes} min`);

  // Check hourly whether it's digest time (UTC hour match, once per day).
  digestCheck = setInterval(async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getUTCHours() === config.scheduler.digestHourUtc && lastDigestDay !== day) {
      lastDigestDay = day;
      try {
        const ok = await runDigest();
        log.info(`digest ${ok ? "sent" : "skipped (telegram off)"}`);
      } catch (err) {
        log.error("digest failed", err instanceof Error ? err.message : err);
      }
    }
  }, 3600_000);

  // Run one cycle shortly after boot so the queue fills immediately.
  setTimeout(fullRun, 15_000);
}

export function stopScheduler() {
  if (scoutTimer) clearInterval(scoutTimer);
  if (digestCheck) clearInterval(digestCheck);
  started = false;
}
