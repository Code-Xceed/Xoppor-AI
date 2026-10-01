/** GET / PATCH / DELETE a single lead. */

import { db } from "@/lib/db";
import { authorize, json, unauthorized } from "@/lib/api";
import { notifyOpportunity } from "@/lib/telegram";
import { categories } from "@/lib/skills";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!authorize(req)) return unauthorized();
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return json({ error: "not found" }, 404);
  return json({ lead });
}

const ALLOWED_STATUSES = ["new", "qualified", "rejected", "archived"];

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!authorize(req)) return unauthorized();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    notes?: string;
    contactEmail?: string;
    category?: string;
    action?: "send_telegram";
  };

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return json({ error: "not found" }, 404);

  // Send direct opportunity alert to Telegram
  if (body.action === "send_telegram") {
    let skills: string[] = [];
    let signals: string[] = [];
    try {
      if (lead.skills) skills = JSON.parse(lead.skills);
      if (lead.signals) signals = JSON.parse(lead.signals);
    } catch {}

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
    }

    return json({ ok, message: ok ? "Opportunity sent to Telegram" : "Failed to send (check Telegram configuration)" });
  }

  const data: Record<string, string> = {};
  if (body.status && ALLOWED_STATUSES.includes(body.status)) data.status = body.status;
  if (typeof body.notes === "string") data.notes = body.notes.slice(0, 2000);
  if (typeof body.contactEmail === "string") data.contactEmail = body.contactEmail.slice(0, 200);
  if (body.category && categories.some((c) => c.id === body.category)) data.category = body.category;
  if (Object.keys(data).length === 0) return json({ error: "nothing to update" }, 400);

  const updated = await db.lead.update({ where: { id }, data });
  return json({ ok: true, lead: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!authorize(req)) return unauthorized();
  const { id } = await params;
  await db.lead.delete({ where: { id } }).catch(() => null);
  return json({ ok: true });
}
