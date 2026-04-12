import { Router } from "express";
import { prisma } from "../db.js";
import { dispatchWebhook } from "../services/webhook-dispatcher.js";
import { requireRole } from "../middleware/rbac.js";

const r = Router({ mergeParams: true });

r.get("/", async (req, res) => {
  try {
    const items = await prisma.webhookConfig.findMany({
      where: { agentId: req.params.agentId },
      orderBy: { createdAt: "desc" },
    });
    res.json(items.map(item => ({
      ...item,
      events: item.events ? JSON.parse(item.events) : [],
      headers: item.headers ? JSON.parse(item.headers) : {},
    })));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { url, events, headers, active } = req.body;
    if (!url || !events) return res.status(400).json({ error: "url and events required" });
    const item = await prisma.webhookConfig.create({
      data: {
        agentId: req.params.agentId,
        url,
        events: JSON.stringify(Array.isArray(events) ? events : [events]),
        headers: headers ? JSON.stringify(headers) : null,
        active: active !== false,
      },
    });
    res.status(201).json({
      ...item,
      events: JSON.parse(item.events),
      headers: item.headers ? JSON.parse(item.headers) : {},
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { url, events, headers, active } = req.body;
    const data = {};
    if (url !== undefined) data.url = url;
    if (events !== undefined) data.events = JSON.stringify(Array.isArray(events) ? events : [events]);
    if (headers !== undefined) data.headers = headers ? JSON.stringify(headers) : null;
    if (active !== undefined) data.active = active;

    const updated = await prisma.webhookConfig.update({
      where: { id: req.params.id },
      data,
    });
    res.json({
      ...updated,
      events: JSON.parse(updated.events),
      headers: updated.headers ? JSON.parse(updated.headers) : {},
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await prisma.webhookConfig.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.post("/:id/test", requireRole("admin"), async (req, res) => {
  try {
    const config = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
    if (!config) return res.status(404).json({ error: "not found" });

    const agent = await prisma.agent.findUnique({
      where: { id: config.agentId },
      select: { id: true, name: true },
    });

    await dispatchWebhook(config.agentId, "test", {
      agent: { id: agent?.id, name: agent?.name },
      conversation: { id: "test", leadName: "Test User", leadPhone: "+000000000000", qualificationScore: 0 },
      summary: "This is a test webhook payload",
    });

    res.json({ sent: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default r;
