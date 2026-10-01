/**
 * Comprehensive Benchmark Suite for the Xoppor AI Opportunity Radar
 * Tests all 11 scout platforms, measures latency, signal yield, contact extraction,
 * AI scoring performance, and Telegram notification delivery.
 */

import { SCOUTS } from "../src/lib/scouts";
import { db } from "../src/lib/db";
import { aiStatus, scoreLead } from "../src/lib/ai";
import { hasTelegram, hasGemini, hasReddit, config } from "../src/lib/config";
import { testTelegram } from "../src/lib/telegram";

type ScoutBenchmark = {
  name: string;
  status: "OK" | "WARN" | "ERR";
  latencyMs: number;
  signalsCount: number;
  hasCompanyPct: number;
  hasBudgetPct: number;
  hasContactPct: number;
  avgDescLength: number;
  error?: string;
};

async function benchmarkScout(scout: (typeof SCOUTS)[0]): Promise<ScoutBenchmark> {
  const t0 = Date.now();
  try {
    const signals = await scout.run();
    const latencyMs = Date.now() - t0;

    if (signals.length === 0) {
      return {
        name: scout.name,
        status: "WARN",
        latencyMs,
        signalsCount: 0,
        hasCompanyPct: 0,
        hasBudgetPct: 0,
        hasContactPct: 0,
        avgDescLength: 0,
        error: "0 signals returned (check rate limits or credentials)",
      };
    }

    const withCompany = signals.filter((s) => s.company && s.company.trim().length > 0).length;
    const withBudget = signals.filter((s) => s.budget && s.budget.trim().length > 0).length;
    const withContact = signals.filter((s) => s.contactEmail || s.contactHandle).length;
    const totalDescLen = signals.reduce((sum, s) => sum + (s.description?.length || 0), 0);

    return {
      name: scout.name,
      status: "OK",
      latencyMs,
      signalsCount: signals.length,
      hasCompanyPct: Math.round((withCompany / signals.length) * 100),
      hasBudgetPct: Math.round((withBudget / signals.length) * 100),
      hasContactPct: Math.round((withContact / signals.length) * 100),
      avgDescLength: Math.round(totalDescLen / signals.length),
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    return {
      name: scout.name,
      status: "ERR",
      latencyMs,
      signalsCount: 0,
      hasCompanyPct: 0,
      hasBudgetPct: 0,
      hasContactPct: 0,
      avgDescLength: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runBenchmark() {
  console.log("=========================================================================");
  console.log("             🛰️  XOPPOR AI RADAR — PLATFORM BENCHMARK SUITE             ");
  console.log("=========================================================================\n");

  console.log("Testing environment integrations:");
  console.log(`  • Gemini AI:  ${hasGemini() ? "CONNECTED (" + config.gemini.model + ")" : "OFF (Heuristic fallback active)"}`);
  console.log(`  • Telegram:   ${hasTelegram() ? "CONFIGURED (Bot ID: " + config.telegram.chatId + ")" : "OFF"}`);
  console.log(`  • Reddit API: ${hasReddit() ? "CONFIGURED" : "PUBLIC MODE (Requires OAuth for full rate limits)"}`);
  console.log(`  • Min Score:  ${config.minOpportunityScore}/100 threshold\n`);

  console.log("Running platform benchmarks across all scout feeds...\n");

  const results: ScoutBenchmark[] = [];
  for (const scout of SCOUTS) {
    process.stdout.write(`  Polling ${scout.name.padEnd(16)} ... `);
    const res = await benchmarkScout(scout);
    results.push(res);
    const statusIcon = res.status === "OK" ? "✅" : res.status === "WARN" ? "⚠️" : "❌";
    console.log(`${statusIcon}  ${String(res.signalsCount).padStart(3)} signals  (${res.latencyMs}ms)`);
  }

  console.log("\n-------------------------------------------------------------------------");
  console.log("                        PLATFORM SCORECARD                               ");
  console.log("-------------------------------------------------------------------------");
  console.log(
    "Platform".padEnd(16) +
    "Status".padEnd(8) +
    "Signals".padEnd(10) +
    "Latency".padEnd(10) +
    "Company %".padEnd(12) +
    "Budget %".padEnd(11) +
    "Contact %"
  );
  console.log("-".repeat(73));

  let totalSignals = 0;
  for (const r of results) {
    totalSignals += r.signalsCount;
    console.log(
      r.name.padEnd(16) +
      r.status.padEnd(8) +
      String(r.signalsCount).padEnd(10) +
      `${r.latencyMs}ms`.padEnd(10) +
      `${r.hasCompanyPct}%`.padEnd(12) +
      `${r.hasBudgetPct}%`.padEnd(11) +
      `${r.hasContactPct}%`
    );
  }
  console.log("-".repeat(73));
  console.log(`Total live signals fetched: ${totalSignals}\n`);

  console.log("-------------------------------------------------------------------------");
  console.log("                        AI SCORER BENCHMARK                              ");
  console.log("-------------------------------------------------------------------------");
  const sampleLead = {
    title: "Senior Fullstack Engineer (Next.js, Python, AI Agents) - $150k-$180k",
    description: "Seed-stage AI startup looking for an experienced fullstack engineer to build our agent workflow platform. Must have Next.js, Python, and LangChain experience. Budget $150k-$180k. Remote worldwide.",
    company: "Nexus AI Labs",
    source: "benchmark",
    category: "job",
  };

  const aiT0 = Date.now();
  const scoreResult = await scoreLead(sampleLead);
  const aiLatency = Date.now() - aiT0;

  console.log(`AI Engine:        ${await aiStatus()}`);
  console.log(`Scoring Latency:  ${aiLatency}ms`);
  console.log(`Sample Score:     ${scoreResult.score}/100`);
  console.log(`AI Reasoning:     ${scoreResult.reason}`);
  console.log(`Matched Skills:   ${scoreResult.matchedSkills.join(", ")}`);
  console.log(`Detected Signals: ${scoreResult.signals.join(", ")}`);
  console.log(`Categories:       jobs · freelance · internships · hackathons · events · bounties\n`);

  console.log("-------------------------------------------------------------------------");
  console.log("                     TELEGRAM DISPATCH BENCHMARK                         ");
  console.log("-------------------------------------------------------------------------");
  const tgStatus = await testTelegram();
  console.log(`Telegram Bot Connectivity: ${tgStatus}\n`);

  console.log("-------------------------------------------------------------------------");
  console.log("                     DATABASE REPOSITORY STATUS                          ");
  console.log("-------------------------------------------------------------------------");
  const [totalLeads, hotLeads, notifiedLeads] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { score: { gte: config.minOpportunityScore } } }),
    db.lead.count({ where: { notifiedAt: { not: null } } }),
  ]);
  console.log(`  • Stored Opportunities in DB: ${totalLeads}`);
  console.log(`  • High-Match Leads (>= ${config.minOpportunityScore}):     ${hotLeads}`);
  console.log(`  • Dispatched Telegram Alerts: ${notifiedLeads}`);

  console.log("\n=========================================================================");
  console.log("                           BENCHMARK COMPLETE                            ");
  console.log("=========================================================================");
}

runBenchmark()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
