import { prisma } from "../db.js";
import { chat } from "./llm/connector.js";
import { jidToNumber } from "./evolution.js";

const CONVERSATION_HISTORY_LIMIT = parseInt(process.env.CONVERSATION_HISTORY_LIMIT || "20", 10);
const FALLBACK_MESSAGE = process.env.FALLBACK_MESSAGE || "Desculpe, estou com uma dificuldade técnica no momento. Por favor, tente novamente em alguns instantes. 🙏";

const CATEGORY_LABELS = {
  context: "Contexto",
  product: "Produtos",
  faq: "FAQ",
  script: "Scripts",
  rules: "Regras",
  objections: "Objeções",
};

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------
export function buildSystemPrompt(agent) {
  const parts = [agent.systemPrompt || ""];

  // Knowledge files grouped by category
  if (agent.knowledgeFiles?.length) {
    const grouped = {};
    for (const kf of agent.knowledgeFiles) {
      const cat = kf.category || "context";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(kf.content);
    }
    for (const [cat, contents] of Object.entries(grouped)) {
      const label = CATEGORY_LABELS[cat] || cat;
      parts.push(`\n## ${label}\n\n${contents.join("\n\n")}`);
    }
  }

  // Qualification criteria
  if (agent.qualificationCriteria) {
    try {
      const parsed = JSON.parse(agent.qualificationCriteria);
      parts.push(`\n## Qualificação\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``);
    } catch { /* ignore invalid JSON */ }
  }

  // Escalation rules
  if (agent.escalationRules) {
    try {
      const parsed = JSON.parse(agent.escalationRules);
      parts.push(`\n## Escalação\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``);
    } catch { /* ignore invalid JSON */ }
  }

  // Response guidelines
  if (agent.responseGuidelines) {
    try {
      const parsed = JSON.parse(agent.responseGuidelines);
      parts.push(`\n## Diretrizes\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``);
    } catch { /* ignore invalid JSON */ }
  }

  return parts.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// evaluateEscalation
// ---------------------------------------------------------------------------
function evaluateEscalation(agent, conversation, llmText) {
  const escalationKeywords = ["transferir", "atendente", "humano", "supervisor", "gerente"];
  const lowerText = llmText.toLowerCase();

  // Check if LLM response contains escalation keywords
  for (const kw of escalationKeywords) {
    if (lowerText.includes(kw)) return true;
  }

  // Check agent escalation rules triggers
  if (agent.escalationRules) {
    try {
      const rules = JSON.parse(agent.escalationRules);
      const triggers = rules.gatilhos || rules.triggers || [];
      // Check last user message against triggers
      const lastUserContent = (conversation._lastUserText || "").toLowerCase();
      for (const trigger of triggers) {
        if (lastUserContent.includes(trigger.toLowerCase())) return true;
      }
    } catch { /* ignore */ }
  }

  return false;
}

// ---------------------------------------------------------------------------
// processIncomingMessage
// ---------------------------------------------------------------------------
export async function processIncomingMessage({ agent, remoteJid, pushName, text, messageType, whatsappMsgId }) {
  const phone = jidToNumber(remoteJid);

  // Upsert conversation
  const conversation = await prisma.conversation.upsert({
    where: {
      agentId_remoteJid: { agentId: agent.id, remoteJid },
    },
    update: {
      leadName: pushName || undefined,
      leadPhone: phone ? `+${phone}` : undefined,
      lastMessageAt: new Date(),
    },
    create: {
      agentId: agent.id,
      remoteJid,
      leadName: pushName || null,
      leadPhone: phone ? `+${phone}` : null,
      status: "active",
      lastMessageAt: new Date(),
    },
  });

  // Non-text message: polite reply, no LLM call
  if (messageType !== "text") {
    const politeReply = "Olá! No momento consigo ler apenas mensagens de texto. Poderia digitar sua dúvida? 😊";

    // Save received message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: `[${messageType || "media"}]`,
        messageType: messageType || "unknown",
        whatsappMsgId,
      },
    });

    // Save reply
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: politeReply,
        messageType: "text",
      },
    });

    return { reply: politeReply, conversation };
  }

  // Conversation is escalated or closed — save msg but don't respond
  if (["escalated", "closed"].includes(conversation.status)) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: text,
        messageType: "text",
        whatsappMsgId,
      },
    });
    return { reply: null, conversation };
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: text,
      messageType: "text",
      whatsappMsgId,
    },
  });

  // Fetch history (last N messages in chronological order)
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: CONVERSATION_HISTORY_LIMIT,
  });

  // Build LLM call
  const systemPrompt = buildSystemPrompt(agent);
  const messages = history.map((m) => ({ role: m.role, content: m.content }));

  let reply;
  let isFallback = false;
  try {
    const result = await chat({
      provider: agent.provider,
      model: agent.model,
      systemPrompt,
      messages,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    });

    reply = result.text;

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        messageType: "text",
        tokensUsed: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
        costEstimate: null,
      },
    });
  } catch (err) {
    console.error("[conversation-manager] LLM error:", err.response?.data || err.message || err);
    reply = FALLBACK_MESSAGE;
    isFallback = true;

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        messageType: "text",
      },
    });

    return { reply, conversation };
  }

  // Evaluate escalation (skip if reply was a fallback — fallback contains keyword "atendente")
  conversation._lastUserText = text;
  if (!isFallback && evaluateEscalation(agent, conversation, reply)) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "escalated" },
    });
    conversation.status = "escalated";
  }

  return { reply, conversation };
}

// ---------------------------------------------------------------------------
// closeConversation
// ---------------------------------------------------------------------------
export async function closeConversation(conversationId) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: "closed",
      closedAt: new Date(),
      summary: null, // TODO: generate summary via LLM
    },
  });
}
