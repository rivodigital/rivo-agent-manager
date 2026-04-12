import { Router } from "express";
import { prisma } from "../db.js";
import { sendText, sendPresence, jidToNumber } from "../services/evolution.js";
import { calculateDelay } from "../services/message-utils.js";

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

// POST /:id/close — close a conversation and send CSAT survey
r.post("/:id/close", async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        agent: {
          include: {
            whatsappInstance: true,
          },
        },
      },
    });

    if (!conversation) return res.status(404).json({ error: "not found" });

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });

    // Send CSAT survey via WhatsApp
    const instance = conversation.agent?.whatsappInstance;
    if (instance && conversation.remoteJid) {
      const csatMessage = `Obrigado pelo contato! Poderia avaliar nosso atendimento de 1 a 5?

1 ⭐ Péssimo
2 ⭐⭐ Ruim
3 ⭐⭐⭐ Regular
4 ⭐⭐⭐⭐ Bom
5 ⭐⭐⭐⭐⭐ Excelente

Basta responder com um número.`;

      try {
        const number = jidToNumber(conversation.remoteJid);
        const delay = calculateDelay(csatMessage);
        await sendPresence(instance.instanceName, number, delay);
        await new Promise(resolve => setTimeout(resolve, delay));
        await sendText(instance.instanceName, number, csatMessage);
        console.log(`[conversations] CSAT enviado para ${conversation.remoteJid}`);
      } catch (err) {
        console.error("[conversations] erro ao enviar CSAT:", err.message || err);
      }
    }

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /:id/resume-bot — resume bot responses
r.post("/:id/resume-bot", async (req, res) => {
  try {
    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        status: "active",
        lastHumanMessageAt: null,
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /:id/notes — add internal note to conversation
r.post("/:id/notes", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation) return res.status(404).json({ error: "not found" });

    const note = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        role: "note",
        content: content.trim(),
        messageType: "internal",
      },
    });

    res.json(note);
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
