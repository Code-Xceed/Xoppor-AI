/** GET /api/leads?status=&category=&minScore=&source=&q=&skip=&limit=&format= — filtered opportunity list or CSV export. POST — manual lead creation. */

import { db } from "@/lib/db";
import { authorize, json, unauthorized } from "@/lib/api";
import { scoreLead } from "@/lib/ai";
import { extractEmails } from "@/lib/scouts/filter";
import { categories } from "@/lib/skills";
import type { Category } from "@/lib/skills";
import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

function toCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function csvResponse(leads: {
  id: string; title: string; company: string | null; source: string; category: string;
  score: number; status: string; budget: string | null; deadline: Date | null;
  url: string; discoveredAt: Date;
}[]): NextResponse {
  const headers = ["ID", "Title", "Company", "Source", "Category", "Score", "Status", "Budget", "Deadline", "URL", "DiscoveredAt"];
  const rows = leads.map((l) => [
    l.id, l.title, l.company ?? "", l.source, l.category, l.score, l.status,
    l.budget ?? "", l.deadline?.toISOString() ?? "", l.url, l.discoveredAt.toISOString(),
  ]);
  const csvContent = [headers.map(toCsvValue).join(","), ...rows.map((r) => r.map(toCsvValue).join(","))].join("\r\n");
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="xoppor-opportunities-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const category = sp.get("category") ?? undefined;
  const source = sp.get("source") ?? undefined;
  const minScore = Number.parseInt(sp.get("minScore") ?? "", 10);
  const q = sp.get("q") ?? undefined;
  const format = sp.get("format");
  const limit = Math.min(Number.parseInt(sp.get("limit") ?? "100", 10) || 100, 1000);
  const skip = Math.max(Number.parseInt(sp.get("skip") ?? "0", 10) || 0, 0);

  // SQLite LIKE is ASCII case-insensitive — use it for user-friendly search
  // (Prisma's `contains` is case-sensitive on SQLite).
  let qIds: string[] | undefined;
  if (q) {
    const like = `%${q}%`;
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM Lead
      WHERE title LIKE ${like} OR company LIKE ${like} OR description LIKE ${like}`;
    qIds = rows.map((r) => r.id);
    if (qIds.length === 0) {
      return format === "csv" ? csvResponse([]) : json({ leads: [], total: 0 });
    }
  }

  const where: Prisma.LeadWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(Number.isFinite(minScore) ? { score: { gte: minScore } } : {}),
    ...(qIds ? { id: { in: qIds } } : {}),
  };

  if (format === "csv") {
    const leads = await db.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
      take: limit,
    });
    return csvResponse(leads);
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
      take: limit,
    }),
    db.lead.count({ where }),
  ]);

  return json({ leads, total });
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    company?: string;
    description?: string;
    url?: string;
    budget?: string;
    category?: string;
    deadline?: string;
    contactEmail?: string;
    contactHandle?: string;
  };

  if (!body.title?.trim()) {
    return json({ error: "Title is required" }, 400);
  }

  const category = categories.some((c) => c.id === body.category) ? (body.category as Category) : "job";
  const deadline = body.deadline ? new Date(body.deadline) : null;

  const url = body.url?.trim() || `manual://${Date.now()}`;
  const externalId = `man_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = body.contactEmail?.trim() || extractEmails(`${body.title}\n${body.description ?? ""}`)[0] || null;

  const scoreResult = await scoreLead({
    title: body.title,
    description: body.description,
    company: body.company,
    tags: null,
    source: "manual",
    category,
  });

  const lead = await db.lead.create({
    data: {
      source: "manual",
      externalId,
      category,
      title: body.title.slice(0, 200),
      company: body.company?.slice(0, 120) || null,
      description: body.description?.slice(0, 4000) || null,
      url,
      budget: body.budget?.slice(0, 100) || null,
      deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
      contactEmail: email,
      contactHandle: body.contactHandle?.slice(0, 100) || null,
      score: scoreResult.score,
      scoreReason: scoreResult.reason,
      skills: JSON.stringify(scoreResult.matchedSkills),
      signals: JSON.stringify(scoreResult.signals),
      status: scoreResult.score >= 70 ? "qualified" : "new",
    },
  });

  return json({ ok: true, lead });
}
