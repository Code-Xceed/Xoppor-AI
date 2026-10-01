/** Pipeline orchestrator — the brain connecting scouts, scoring, notifications. */

import { db } from "./db";
import { aiStatus, scoreLead } from "./ai";
import { config, hasTelegram } from "./config";
import { SCOUTS, type ScoutResult } from "./scouts";
import { extractEmails } from "./scouts/filter";
import { createLogger } from "./logger";
import { notifyDigest, notifyOpportunity } from "./telegram";

const log = createLogger("pipeline");

async function logRun(runType: string, ok: boolean, summary: string) {
  await db.runLog.create({ data: { runType, ok, summary: summary.slice(0, 500) } });
}

// ── Scout phase ─────────────────────────────────────────────────────────────

export async function runScouts(): Promise<{ results: ScoutResult[]; newLeads: number }> {
  const results: ScoutResult[] = [];
  let newLeads = 0;

  for (const scout of SCOUTS) {
    try {
      const signals = await scout.run();
      for (const sig of signals) {
        const exists = await db.lead.findUnique({
          where: { source_externalId: { source: sig.source, externalId: sig.externalId } },
          select: { id: true },
        });
        if (exists) continue;
        try {
          await db.lead.create({
            data: {
              source: sig.source,
              externalId: sig.externalId,
              category: sig.category ?? "job",
              title: sig.title,
              company: sig.company,
              description: sig.description,
              url: sig.url,
              location: sig.location,
              budget: sig.budget,
              deadline: sig.deadline,
              contactEmail: sig.contactEmail || extractEmails(`${sig.title}\n${sig.description ?? ""}`)[0] || null,
              contactHandle: sig.contactHandle,
              tags: sig.tags ? JSON.stringify(sig.tags) : null,
              postedAt: sig.postedAt,
            },
          });
          newLeads++;
        } catch {
          // Unique violation from a parallel run — fine.
        }
      }
      results.push({ source: scout.name, enabled: true, fetched: signals.length });
      log.info(`scout ${scout.name}: ${signals.length} signals`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ source: scout.name, enabled: true, fetched: 0, error: msg });
      log.warn(`scout ${scout.name} failed: ${msg}`);
    }
  }

  await logRun("scout", true, results.map((r) => `${r.source}:${r.fetched}${r.error ? ` (ERR ${r.error.slice(0, 80)})` : ""}`).join(" | "));
  return { results, newLeads };
}

// ── Score phase ─────────────────────────────────────────────────────────────

export async function runScoring(limit = 20): Promise<{ scored: number; hot: number; alerted: number }> {
  const leads = await db.lead.findMany({
    where: { score: 0, status: "new" },
    orderBy: { discoveredAt: "desc" },
    take: limit,
  });

  let hot = 0;
  let alerted = 0;

  // Score in small parallel batches with gentle pacing to stay within free-tier limits.
  const BATCH = 2;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (lead) => ({ lead, result: await scoreLead(lead) }))
    );
    await Promise.all(
      results.map(async ({ lead, result }) => {
        const isHot = result.score >= config.minOpportunityScore;
        let notified = false;

        if (isHot && hasTelegram()) {
          try {
            let skills: string[] = [];
            let signals: string[] = [];
            try {
              if (lead.skills) skills = JSON.parse(lead.skills);
              if (lead.signals) signals = JSON.parse(lead.signals);
            } catch {
              // keep empty
            }
            notified = await notifyOpportunity({
              title: lead.title,
              company: lead.company,
              category: lead.category,
              score: result.score,
              scoreReason: result.reason,
              skills: result.matchedSkills,
              signals: result.signals,
              description: lead.description,
              budget: lead.budget,
              location: lead.location,
              deadline: lead.deadline,
              url: lead.url,
              source: lead.source,
              contactEmail: lead.contactEmail,
              contactHandle: lead.contactHandle,
            });
            if (notified) alerted++;
          } catch (err) {
            log.warn(`telegram alert failed for ${lead.id}`, err);
          }
        }

        await db.lead.update({
          where: { id: lead.id },
          data: {
            score: result.score,
            scoreReason: result.reason,
            skills: JSON.stringify(result.matchedSkills),
            signals: JSON.stringify(result.signals),
            status: isHot ? "qualified" : result.score < 35 ? "rejected" : "new",
            notifiedAt: notified ? new Date() : null,
          },
        });
        if (isHot) hot++;
      })
    );

    if (i + BATCH < leads.length) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  await logRun("score", true, `scored ${leads.length}, hot ${hot}, alerted ${alerted} (ai: ${await aiStatus()})`);
  return { scored: leads.length, hot, alerted };
}

export async function alertPendingOpportunities(limit = 10): Promise<number> {
  if (!hasTelegram()) return 0;

  const pending = await db.lead.findMany({
    where: {
      score: { gte: config.minOpportunityScore },
      notifiedAt: null,
    },
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
    take: limit,
  });

  let sent = 0;
  for (const lead of pending) {
    let skills: string[] = [];
    let signals: string[] = [];
    try {
      if (lead.skills) skills = JSON.parse(lead.skills);
      if (lead.signals) signals = JSON.parse(lead.signals);
    } catch {
      // keep empty
    }

    const ok = await notifyOpportunity({
      title: lead.title,
      company: lead.company,
      category: lead.category,
      score: lead.score,
      scoreReason: lead.scoreReason,
      skills,
      signals,
      description: lead.description,
      budget: lead.budget,
      location: lead.location,
      deadline: lead.deadline,
      url: lead.url,
      source: lead.source,
      contactEmail: lead.contactEmail,
      contactHandle: lead.contactHandle,
    });

    if (ok) {
      await db.lead.update({
        where: { id: lead.id },
        data: { notifiedAt: new Date() },
      });
      sent++;
    }
  }

  if (sent > 0) {
    log.info(`alerted ${sent} pending opportunities to telegram`);
  }
  return sent;
}

// ── Digest ──────────────────────────────────────────────────────────────────

export async function runDigest(): Promise<boolean> {
  // Housekeeping: keep only the last 30 days of run logs.
  await db.runLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [newLeads, qualified, hotByCategory, topLeads] = await Promise.all([
    db.lead.count({ where: { discoveredAt: { gte: startOfDay } } }),
    db.lead.count({ where: { score: { gte: 70 } } }),
    db.lead.groupBy({
      by: ["category"],
      where: { score: { gte: config.minOpportunityScore } },
      _count: { _all: true },
    }),
    db.lead.findMany({
      where: { score: { gte: 70 } },
      orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
      take: 4,
      select: { title: true, company: true, score: true, url: true, source: true },
    }),
  ]);

  const ok = await notifyDigest(
    { newLeads, qualified, byCategory: hotByCategory.map((h) => ({ category: h.category, count: h._count._all })) },
    topLeads
  );
  await logRun("digest", ok, ok ? "digest sent" : "telegram not configured");
  return ok;
}

// ── Stats for dashboard ─────────────────────────────────────────────────────

export async function getStats() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [total, today, qualified, byCategory, runs] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { discoveredAt: { gte: startOfDay } } }),
    db.lead.count({ where: { score: { gte: 70 } } }),
    db.lead.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
    db.runLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return { total, today, qualified, byCategory, runs };
}
