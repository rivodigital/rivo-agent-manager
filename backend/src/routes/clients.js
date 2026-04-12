import { Router } from "express";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/rbac.js";

const r = Router();

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

r.get("/", async (req, res) => {
  const { status, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) where.name = { contains: String(search) };
  const items = await prisma.client.findMany({
    where,
    include: { _count: { select: { agents: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

r.post("/", requireRole("admin"), async (req, res) => {
  const { name, slug, segment, contactName, contactEmail, contactPhone, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const created = await prisma.client.create({
      data: {
        name,
        slug: slug || slugify(name),
        segment, contactName, contactEmail, contactPhone, notes,
        status: status || "active",
      },
    });
    res.status(201).json(created);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.get("/:id", async (req, res) => {
  const c = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: { agents: { include: { provider: true } } },
  });
  if (!c) return res.status(404).json({ error: "not found" });
  res.json(c);
});

r.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

export default r;
