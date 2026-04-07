import { Router } from "express";
import { prisma } from "../db.js";
import {
  createInstance,
  deleteInstance,
  connectInstance,
  getConnectionState,
  stripDataUrl,
} from "../services/evolution.js";

const r = Router();

// GET /instances — list all WhatsApp instances
r.get("/instances", async (_req, res) => {
  try {
    const items = await prisma.whatsAppInstance.findMany({
      include: { agent: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /instances — create a new instance
r.post("/instances", async (req, res) => {
  try {
    const { agentId, instanceName } = req.body;
    if (!agentId || !instanceName) {
      return res.status(400).json({ error: "agentId and instanceName required" });
    }

    // Validate agent exists
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return res.status(404).json({ error: "agent not found" });

    // Check no existing instance
    const existing = await prisma.whatsAppInstance.findUnique({ where: { agentId } });
    if (existing) return res.status(400).json({ error: "agent already has a WhatsApp instance" });

    // Create on Evolution API
    const evoData = await createInstance(instanceName);

    // Save to DB
    const instance = await prisma.whatsAppInstance.create({
      data: {
        agentId,
        instanceName,
        status: "qr_code",
        qrCode: stripDataUrl(evoData.qrcode?.base64) || null,
        instanceId: evoData.instance?.instanceId || null,
      },
    });

    res.status(201).json(instance);
  } catch (e) {
    res.status(400).json({ error: e.response?.data || e.message });
  }
});

// GET /instances/:id/qrcode — get QR code
r.get("/instances/:id/qrcode", async (req, res) => {
  try {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: req.params.id },
    });
    if (!instance) return res.status(404).json({ error: "instance not found" });

    if (instance.qrCode) {
      return res.json({ qrCode: instance.qrCode });
    }

    // Generate new QR
    const data = await connectInstance(instance.instanceName);
    const qrCode = stripDataUrl(data.base64 || data.qrcode?.base64) || null;

    if (qrCode) {
      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { qrCode },
      });
    }

    res.json({ qrCode });
  } catch (e) {
    res.status(400).json({ error: e.response?.data || e.message });
  }
});

// POST /instances/:id/connect — reconnect / generate new QR
r.post("/instances/:id/connect", async (req, res) => {
  try {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: req.params.id },
    });
    if (!instance) return res.status(404).json({ error: "instance not found" });

    const data = await connectInstance(instance.instanceName);
    const qrCode = stripDataUrl(data.base64 || data.qrcode?.base64) || null;

    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { qrCode, status: "qr_code" },
    });

    res.json({ qrCode });
  } catch (e) {
    res.status(400).json({ error: e.response?.data || e.message });
  }
});

// GET /instances/:id/status — check connection status
r.get("/instances/:id/status", async (req, res) => {
  try {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: req.params.id },
    });
    if (!instance) return res.status(404).json({ error: "instance not found" });

    const state = await getConnectionState(instance.instanceName);
    const stateStr = state.instance?.state || state.state || "close";

    const statusMap = { open: "connected", close: "disconnected" };
    const newStatus = statusMap[stateStr] || "connecting";

    const updateData = { status: newStatus };
    if (newStatus === "connected") updateData.connectedAt = new Date();

    const updated = await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: updateData,
    });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.response?.data || e.message });
  }
});

// DELETE /instances/:id — delete instance
r.delete("/instances/:id", async (req, res) => {
  try {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: req.params.id },
    });
    if (!instance) return res.status(404).json({ error: "instance not found" });

    // Delete from Evolution (ignore errors if already gone)
    try {
      await deleteInstance(instance.instanceName);
    } catch { /* ignore */ }

    // Delete from DB
    await prisma.whatsAppInstance.delete({ where: { id: instance.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e.response?.data || e.message });
  }
});

export default r;
