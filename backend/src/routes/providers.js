import { Router } from "express";
import { prisma } from "../db.js";
import { testConnection } from "../services/llm/connector.js";
import { requireRole } from "../middleware/rbac.js";

const r = Router();

r.get("/", async (_req, res) => {

r.get("/", async (_req, res) => {
  const items = await prisma.provider.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items.map(p => ({ ...p, models: safeParse(p.models, []) })));
});

r.post("/", requireRole("admin"), async (req, res) => {
  const { name, label, apiKey, baseUrl, status, models } = req.body;
  if (!name || !label || !apiKey) return res.status(400).json({ error: "name, label, apiKey required" });
  try {
    const created = await prisma.provider.create({
      data: {
        name, label, apiKey, baseUrl: baseUrl || null,
        status: status || "active",
        models: JSON.stringify(models || []),
      },
    });
    res.status(201).json({ ...created, models: safeParse(created.models, []) });
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.get("/:id", async (req, res) => {
  const p = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "not found" });
  res.json({ ...p, models: safeParse(p.models, []) });
});

r.put("/:id", requireRole("admin"), async (req, res) => {
  const { name, label, apiKey, baseUrl, status, models } = req.body;
  try {
    const updated = await prisma.provider.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(label !== undefined && { label }),
        ...(apiKey !== undefined && { apiKey }),
        ...(baseUrl !== undefined && { baseUrl }),
        ...(status !== undefined && { status }),
        ...(models !== undefined && { models: JSON.stringify(models) }),
      },
    });
    res.json({ ...updated, models: safeParse(updated.models, []) });
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await prisma.provider.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.post("/:id/test", async (req, res) => {
  const p = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "not found" });
  const result = await testConnection({ name: p.name, apiKey: p.apiKey, baseUrl: p.baseUrl });
  res.json(result);
});

function safeParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

export default r;
