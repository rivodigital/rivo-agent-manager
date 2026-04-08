import { Router } from "express";
import { prisma } from "../db.js";

const r = Router();

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

r.get("/", async (req, res) => {
  const { clientId, status } = req.query;
  const where = {};
  if (clientId) where.clientId = String(clientId);
  if (status) where.status = String(status);
  const items = await prisma.agent.findMany({
    where,
    include: { client: true, provider: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

r.post("/", async (req, res) => {
  const b = req.body;
  if (!b.clientId || !b.providerId || !b.name || !b.model)
    return res.status(400).json({ error: "clientId, providerId, name, model required" });
  try {
    const created = await prisma.agent.create({
      data: {
        clientId: b.clientId,
        providerId: b.providerId,
        name: b.name,
        slug: b.slug || `${slugify(b.name)}-${Date.now().toString(36)}`,
        description: b.description || null,
        model: b.model,
        systemPrompt: b.systemPrompt || "",
        temperature: b.temperature ?? 0.7,
        maxTokens: b.maxTokens ?? 2048,
        qualificationCriteria: b.qualificationCriteria || null,
        escalationRules: b.escalationRules || null,
        responseGuidelines: b.responseGuidelines || null,
        channels: b.channels || null,
        implementationPhase: b.implementationPhase || "diagnosis",
        status: b.status || "draft",
        monthlyCostEstimate: b.monthlyCostEstimate || null,
        clientValueMetric: b.clientValueMetric || null,
      },
    });
    res.status(201).json(created);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.get("/:id", async (req, res) => {
  const a = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      provider: true,
      knowledgeFiles: { orderBy: { sortOrder: "asc" } },
      agentNotes: { orderBy: { createdAt: "desc" } },
      whatsappInstance: true,
    },
  });
  if (!a) return res.status(404).json({ error: "not found" });
  res.json(a);
});

r.put("/:id", async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.client; delete data.provider;
    delete data.knowledgeFiles; delete data.agentNotes; delete data.usageLogs;
    delete data.whatsappInstance; delete data.conversations;
    delete data.createdAt; delete data.updatedAt;
    const updated = await prisma.agent.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.delete("/:id", async (req, res) => {
  try {
    await prisma.agent.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

export default r;
