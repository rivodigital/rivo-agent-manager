import { Router } from "express";
import { prisma } from "../db.js";

const r = Router({ mergeParams: true });

r.get("/", async (req, res) => {
  const items = await prisma.agentNote.findMany({
    where: { agentId: req.params.agentId },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

r.post("/", async (req, res) => {
  const { type, content } = req.body;
  if (!type || !content) return res.status(400).json({ error: "type, content required" });
  try {
    const created = await prisma.agentNote.create({
      data: { agentId: req.params.agentId, type, content },
    });
    res.status(201).json(created);
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

r.delete("/:id", async (req, res) => {
  try {
    await prisma.agentNote.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

export default r;
