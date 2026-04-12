import { prisma } from "../db.js";
import { sendText, sendPresence, jidToNumber } from "./evolution.js";
import { calculateDelay } from "./message-utils.js";

export async function scheduleFollowUps(conversationId, agentConfig) {
  if (!agentConfig || !agentConfig.enabled) return;

  try {
    const cfg = typeof agentConfig === "string" ? JSON.parse(agentConfig) : agentConfig;
    if (!cfg.enabled || !cfg.delays || !cfg.messages) return;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { agent: { include: { whatsappInstance: true } } },
    });

    if (!conversation || !conversation.agent.whatsappInstance) return;

    const baseTime = new Date();
    for (let i = 0; i < cfg.delays.length; i++) {
      const delayMinutes = cfg.delays[i];
      const scheduledAt = new Date(baseTime.getTime() + delayMinutes * 60_000);
      await prisma.followUp.create({
        data: {
          conversationId,
          message: cfg.messages[i] || cfg.messages[cfg.messages.length - 1],
          scheduledAt,
          status: "pending",
        },
      });
    }
  } catch (err) {
    console.error("[follow-up] scheduleFollowUps error:", err.message || err);
  }
}

export async function cancelPendingFollowUps(conversationId) {
  try {
    await prisma.followUp.updateMany({
      where: { conversationId, status: "pending" },
      data: { status: "cancelled" },
    });
  } catch (err) {
    console.error("[follow-up] cancelPendingFollowUps error:", err.message || err);
  }
}

export async function processPendingFollowUps() {
  try {
    const pending = await prisma.followUp.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() },
      },
      include: {
        conversation: {
          include: {
            agent: { include: { whatsappInstance: true } },
          },
        },
      },
    });

    for (const followUp of pending) {
      const instance = followUp.conversation.agent?.whatsappInstance;
      if (!instance || !followUp.conversation.remoteJid) {
        await prisma.followUp.update({ where: { id: followUp.id }, data: { status: "cancelled" } });
        continue;
      }

      try {
        const number = jidToNumber(followUp.conversation.remoteJid);
        const delay = calculateDelay(followUp.message);
        await sendPresence(instance.instanceName, number, delay);
        await new Promise(r => setTimeout(r, delay));
        await sendText(instance.instanceName, number, followUp.message);
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "sent", sentAt: new Date() },
        });
        console.log(`[follow-up] sent for conv=${followUp.conversationId}`);
      } catch (err) {
        console.error("[follow-up] send error:", err.message || err);
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "cancelled" },
        });
      }
    }
  } catch (err) {
    console.error("[follow-up] processPendingFollowUps error:", err.message || err);
  }
}
