import { Router } from "express";
import { prisma } from "../db.js";

const r = Router();

// GET / — list conversations with optional filters
r.get("/", async (req, res) => {
  try {
    const { agentId, status } = req.query;
    const where = {};
    if (agentId) where.agentId = String(agentId);
    if (status) where.status = String(status);

    const items = await prisma.conversation.findMany({
      where,
      include: {
        agent: { include: { client: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /:id — single conversation with messages
r.get("/:id", async (req, res) => {
  try {
    const item = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        agent: { include: { client: true } },
      },
    });
    if (!item) return res.status(404).json({ error: "not found" });
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /:id — update conversation fields
r.put("/:id", async (req, res) => {
  try {
    const allowed = ["status", "assignedTo", "qualificationScore", "qualificationData"];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /:id/close — close a conversation
r.post("/:id/close", async (req, res) => {
  try {
    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default r;

// ---------------------------------------------------------------------------
// Sub-router for /api/agents/:agentId/conversations (mergeParams)
// ---------------------------------------------------------------------------
export const conversationsByAgent = Router({ mergeParams: true });

conversationsByAgent.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const where = { agentId: req.params.agentId };
    if (status) where.status = String(status);

    const items = await prisma.conversation.findMany({
      where,
      include: {
        agent: { include: { client: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
