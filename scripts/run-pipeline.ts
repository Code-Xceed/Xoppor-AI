/** CLI entrypoint — npm run pipeline | scout | score | digest */

import { alertPendingOpportunities, runDigest, runScoring, runScouts } from "../src/lib/pipeline";
import { aiStatus } from "../src/lib/ai";

async function main() {
  const command = process.argv[2] ?? "all";
  const t0 = Date.now();

  switch (command) {
    case "scout": {
      const { results, newLeads } = await runScouts();
      console.log("\nScout results across the internet:");
      for (const r of results) {
        console.log(`  ${r.source.padEnd(16)} ${String(r.fetched).padStart(3)} signals${r.error ? ` — ${r.error}` : ""}`);
      }
      console.log(`New opportunities added: ${newLeads}`);
      break;
    }
    case "score": {
      const { scored, hot, alerted } = await runScoring(60);
      const pendingAlerted = await alertPendingOpportunities(10);
      console.log(`Scored ${scored} opportunities (${hot} hot >= 70). Telegram alerts sent: ${alerted + pendingAlerted}. AI: ${await aiStatus()}`);
      break;
    }
    case "alert": {
      const alerted = await alertPendingOpportunities(10);
      console.log(`Dispatched ${alerted} pending opportunity alerts to Telegram.`);
      break;
    }
    case "digest": {
      const ok = await runDigest();
      console.log(ok ? "Digest sent ✓" : "Digest skipped (Telegram not configured).");
      break;
    }
    case "all":
    default: {
      const { results, newLeads } = await runScouts();
      const { scored, hot, alerted } = await runScoring(30);
      const pendingAlerted = await alertPendingOpportunities(10);
      console.log("\nScout results across the internet:");
      for (const r of results) {
        console.log(`  ${r.source.padEnd(16)} ${String(r.fetched).padStart(3)} signals${r.error ? ` — ${r.error}` : ""}`);
      }
      console.log(`\nRadar summary:`);
      console.log(`  New opportunities scouted: ${newLeads}`);
      console.log(`  Scored: ${scored} (${hot} hot)`);
      console.log(`  Telegram alerts dispatched: ${alerted + pendingAlerted}`);
      console.log(`  AI: ${await aiStatus()}`);
      break;
    }
  }

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
