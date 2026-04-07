import { Router } from "express";
import { prisma } from "../db.js";

const r = Router();

r.get("/stats", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    clients,
    agents,
    agentsByStatus,
    agentsByPhase,
    recentAgents,
    instancesTotal,
    instancesConnected,
    conversationsActive,
    conversationsToday,
    qualifiedToday,
    recentConversations,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.agent.count(),
    prisma.agent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.agent.groupBy({ by: ["implementationPhase"], _count: { _all: true } }),
    prisma.agent.findMany({
      take: 5, orderBy: { updatedAt: "desc" },
      include: { client: true, provider: true },
    }),
    prisma.whatsAppInstance.count(),
    prisma.whatsAppInstance.count({ where: { status: "connected" } }),
    prisma.conversation.count({ where: { status: "active" } }),
    prisma.conversation.count({ where: { lastMessageAt: { gte: todayStart } } }),
    prisma.conversation.count({
      where: { status: "qualified", updatedAt: { gte: todayStart } },
    }),
    prisma.conversation.findMany({
      take: 5,
      orderBy: { lastMessageAt: "desc" },
      include: { agent: { include: { client: true } } },
    }),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stuckTesting = await prisma.agent.findMany({
    where: { status: "testing", updatedAt: { lt: sevenDaysAgo } },
    include: { client: true },
  });

  res.json({
    totals: {
      clients,
      agents,
      activeAgents: agentsByStatus.find(s => s.status === "active")?._count._all || 0,
      draftAgents: agentsByStatus.find(s => s.status === "draft")?._count._all || 0,
    },
    agentsByStatus: agentsByStatus.map(s => ({ status: s.status, count: s._count._all })),
    agentsByPhase: agentsByPhase.map(p => ({ phase: p.implementationPhase, count: p._count._all })),
    recentAgents,
    whatsapp: {
      instancesTotal,
      instancesConnected,
      conversationsActive,
      conversationsToday,
      qualifiedToday,
    },
    recentConversations,
    alerts: stuckTesting.map(a => ({
      type: "warning",
      message: `Agente "${a.name}" (${a.client.name}) está em testing há mais de 7 dias`,
      agentId: a.id,
    })),
  });
});

export default r;
