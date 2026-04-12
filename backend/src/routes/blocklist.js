import { Router } from "express";
import { prisma } from "../db.js";
import { requireRole } from "../middleware/rbac.js";

const r = Router();

r.get("/", async (_req, res) => {
  try {
    const items = await prisma.blocklist.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.post("/", requireRole("admin", "operator"), async (req, res) => {
  try {
    const { phone, reason } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });

    const cleanPhone = String(phone).replace(/\D/g, "");
    const item = await prisma.blocklist.create({
      data: { phone: cleanPhone, reason: reason || null },
    });
    res.json(item);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "phone already blocked" });
    res.status(400).json({ error: e.message });
  }
});

r.delete("/:id", requireRole("admin", "operator"), async (req, res) => {
  try {
    await prisma.blocklist.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default r;
