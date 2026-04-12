import { Router } from "express";
import { prisma } from "../db.js";

const r = Router();

r.get("/stats", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalConversations,
    activeConversations,
    escalatedConversations,
    closedConversations,
    qualifiedLeads,
    csatResult,
    recentConversations,
    byAgent,
    clients,
    agents,
    agentsByStatus,
    agentsByPhase,
    recentAgents,
    instancesTotal,
    instancesConnected,
    conversationsToday,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.count({ where: { status: "active" } }),
    prisma.conversation.count({ where: { status: "escalated" } }),
    prisma.conversation.count({ where: { status: "closed" } }),
    prisma.conversation.count({ where: { qualificationScore: { gte: 60 } } }),
    prisma.conversation.aggregate({
      _avg: { csatScore: true },
      where: { csatScore: { not: null } },
    }),
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 10,
      include: { agent: { select: { name: true } } },
    }),
    prisma.conversation.groupBy({
      by: ["agentId"],
      _count: true,
      orderBy: { _count: { agentId: "desc" } },
      take: 5,
    }),
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
    prisma.conversation.count({ where: { lastMessageAt: { gte: todayStart } } }),
  ]);

  const csatAvg = csatResult._avg.csatScore || 0;

  const agentIds = byAgent.map(a => a.agentId);
  const agentsWithNames = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentNameMap = Object.fromEntries(agentsWithNames.map(a => [a.id, a.name]));

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
      totalConversations,
      activeConversations,
      qualifiedLeads,
      csatAvg: Math.round(csatAvg * 10) / 10,
    },
    byStatus: {
      active: activeConversations,
      escalated: escalatedConversations,
      closed: closedConversations,
    },
    agentsByStatus: agentsByStatus.map(s => ({ status: s.status, count: s._count._all })),
    agentsByPhase: agentsByPhase.map(p => ({ phase: p.implementationPhase, count: p._count._all })),
    recentAgents,
    recentConversations,
    topAgents: byAgent.map(a => ({
      agentId: a.agentId,
      name: agentNameMap[a.agentId] || "Unknown",
      count: a._count,
    })),
    whatsapp: {
      instancesTotal,
      instancesConnected,
      conversationsToday,
    },
    alerts: stuckTesting.map(a => ({
      type: "warning",
      message: `Agente "${a.name}" (${a.client.name}) está em testing há mais de 7 dias`,
      agentId: a.id,
    })),
  });
});

export default r;
