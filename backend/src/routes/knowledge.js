import { Router } from "express";
import { prisma } from "../db.js";

const r = Router({ mergeParams: true });

r.get("/", async (req, res) => {
  const items = await prisma.knowledgeFile.findMany({
    where: { agentId: req.params.agentId },
    orderBy: { sortOrder: "asc" },
  });
  res.json(items);
});

r.post("/", async (req, res) => {
  const { title, category, content, sortOrder } = req.body;
  if (!title || !category) return res.status(400).json({ error: "title, category required" });
  try {
    const created = await prisma.knowledgeFile.create({
      data: {
        agentId: req.params.agentId,
        title, category,
        content: content || "",
        sortOrder: sortOrder ?? 0,
      },
    });
    res.status(201).json(created);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.put("/reorder", async (req, res) => {
  const { order } = req.body; // [{id, sortOrder}]
  if (!Array.isArray(order)) return res.status(400).json({ error: "order array required" });
  try {
    await prisma.$transaction(
      order.map(({ id, sortOrder }) =>
        prisma.knowledgeFile.update({ where: { id }, data: { sortOrder } })
      )
    );
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.put("/:id", async (req, res) => {
  try {
    const updated = await prisma.knowledgeFile.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.delete("/:id", async (req, res) => {
  try {
    await prisma.knowledgeFile.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

export default r;
