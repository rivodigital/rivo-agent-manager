import { Router } from "express";
import { prisma } from "../db.js";

const r = Router();

function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escape(row[h])).join(","));
  return [headerLine, ...dataLines].join("\n");
}

r.get("/conversations", async (req, res) => {
  try {
    const { agentId, status, from, to } = req.query;
    const where = {};
    if (agentId) where.agentId = String(agentId);
    if (status) where.status = String(status);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const items = await prisma.conversation.findMany({
      where,
      include: { agent: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "id",
      "remoteJid",
      "leadName",
      "status",
      "agentName",
      "clientName",
      "qualificationScore",
      "csatScore",
      "tags",
      "createdAt",
      "lastMessageAt",
      "closedAt",
    ];

    const rows = items.map((c) => ({
      id: c.id,
      remoteJid: c.remoteJid || "",
      leadName: c.leadName || "",
      status: c.status,
      agentName: c.agent?.name || "",
      clientName: c.agent?.client?.name || "",
      qualificationScore: c.qualificationScore || "",
      csatScore: c.csatScore || "",
      tags: c.tags ? JSON.parse(c.tags).join("; ") : "",
      createdAt: c.createdAt?.toISOString() || "",
      lastMessageAt: c.lastMessageAt?.toISOString() || "",
      closedAt: c.closedAt?.toISOString() || "",
    }));

    const csv = toCSV(headers, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=conversations.csv");
    res.send(csv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.get("/messages", async (req, res) => {
  try {
    const { conversationId, from, to } = req.query;
    const where = {};
    if (conversationId) where.conversationId = String(conversationId);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const items = await prisma.message.findMany({
      where,
      include: { conversation: { include: { agent: true } } },
      orderBy: { createdAt: "asc" },
      take: 10000,
    });

    const headers = [
      "id",
      "conversationId",
      "role",
      "content",
      "messageType",
      "sentiment",
      "agentName",
      "createdAt",
    ];

    const rows = items.map((m) => ({
      id: m.id,
      conversationId: m.conversationId || "",
      role: m.role,
      content: m.content || "",
      messageType: m.messageType || "",
      sentiment: m.sentiment || "",
      agentName: m.conversation?.agent?.name || "",
      createdAt: m.createdAt?.toISOString() || "",
    }));

    const csv = toCSV(headers, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=messages.csv");
    res.send(csv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.get("/metrics", async (req, res) => {
  try {
    const { agentId, from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    }

    const convWhere = { ...dateFilter };
    if (agentId) convWhere.agentId = String(agentId);

    const [
      total,
      active,
      escalated,
      closed,
      qualified,
      csatResult,
      byStatus,
      followUpsPending,
      followUpsSent,
    ] = await Promise.all([
      prisma.conversation.count({ where: convWhere }),
      prisma.conversation.count({ where: { ...convWhere, status: "active" } }),
      prisma.conversation.count({ where: { ...convWhere, status: "escalated" } }),
      prisma.conversation.count({ where: { ...convWhere, status: "closed" } }),
      prisma.conversation.count({ where: { ...convWhere, qualificationScore: { gte: 60 } } }),
      prisma.conversation.aggregate({ _avg: { csatScore: true }, where: { ...convWhere, csatScore: { not: null } } }),
      prisma.conversation.groupBy({ by: ["status"], _count: true, where: convWhere }),
      prisma.followUp.count({ where: { ...convWhere, status: "pending" } }),
      prisma.followUp.count({ where: { ...convWhere, status: "sent" } }),
    ]);

    const headers = ["metric", "value"];
    const rows = [
      ["Total Conversas", total],
      ["Ativas", active],
      ["Escaladas", escalated],
      ["Encerradas", closed],
      ["Lead Qualificados (score>=60)", qualified],
      ["CSAT Médio", csatResult._avg.csatScore ? Math.round(csatResult._avg.csatScore * 10) / 10 : "N/A"],
      ["Follow-ups Pendentes", followUpsPending],
      ["Follow-ups Enviados", followUpsSent],
      ...byStatus.map((s) => [`Status: ${s.status}`, s._count]),
    ];

    const csv = toCSV(headers, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=metrics.csv");
    res.send(csv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default r;