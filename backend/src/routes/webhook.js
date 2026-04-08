import { Router } from "express";
import { prisma } from "../db.js";
import { processIncomingMessage } from "../services/conversation-manager.js";
import { sendText, jidToNumber, stripDataUrl, getMediaBase64 } from "../services/evolution.js";
import { transcribeAudio } from "../services/transcribe.js";

const r = Router();

const MESSAGE_BUFFER_SECONDS = parseInt(process.env.MESSAGE_BUFFER_SECONDS || "3", 10);

// ---------------------------------------------------------------------------
// In-memory buffer for rapid messages
// ---------------------------------------------------------------------------
const pendingByConv = new Map();

function bufferMessage({ agent, instanceName, remoteJid, pushName, text, messageType, whatsappMsgId }) {
  const key = `${agent.id}:${remoteJid}`;
  let entry = pendingByConv.get(key);

  if (!entry) {
    entry = { timer: null, parts: [], agent, instanceName, remoteJid, pushName, messageType };
    pendingByConv.set(key, entry);
  }

  // Update latest pushName / messageType
  entry.pushName = pushName || entry.pushName;
  entry.whatsappMsgId = whatsappMsgId;

  // If non-text, just push immediately (don't buffer)
  if (messageType !== "text") {
    entry.parts.push({ text: text || "", messageType });
  } else {
    entry.parts.push({ text: text || "", messageType: "text" });
  }

  // Reset timer
  if (entry.timer) clearTimeout(entry.timer);

  entry.timer = setTimeout(async () => {
    pendingByConv.delete(key);
    await flushBuffer(entry);
  }, MESSAGE_BUFFER_SECONDS * 1000);
}

async function flushBuffer(entry) {
  try {
    const { agent, instanceName, remoteJid, pushName, whatsappMsgId } = entry;

    // Determine messageType — if any part is non-text, use the first non-text type
    const nonTextPart = entry.parts.find((p) => p.messageType !== "text");
    const messageType = nonTextPart ? nonTextPart.messageType : "text";
    const aggregatedText = entry.parts.map((p) => p.text).filter(Boolean).join("\n");

    const { reply } = await processIncomingMessage({
      agent,
      remoteJid,
      pushName,
      text: aggregatedText,
      messageType,
      whatsappMsgId,
    });

    if (reply) {
      const number = jidToNumber(remoteJid);
      await sendText(instanceName, number, reply);
    }
  } catch (err) {
    console.error("[webhook] flushBuffer error:", err.message || err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractText(data) {
  if (data.message?.conversation) return data.message.conversation;
  if (data.message?.extendedTextMessage?.text) return data.message.extendedTextMessage.text;
  return null;
}

function detectMessageType(data) {
  const msg = data.message || {};
  if (msg.reactionMessage) return "reaction";
  if (msg.conversation || msg.extendedTextMessage) return "text";
  const raw = data.messageType;
  if (raw === "reactionMessage") return "reaction";
  if (raw === "conversation" || raw === "extendedTextMessage") return "text";
  if (raw === "audioMessage" || msg.audioMessage) return "audio";
  if (raw) return raw;
  if (msg.imageMessage) return "image";
  if (msg.documentMessage) return "document";
  if (msg.stickerMessage) return "sticker";
  if (msg.videoMessage) return "video";
  if (msg.locationMessage) return "location";
  return "unknown";
}

// ---------------------------------------------------------------------------
// POST / (mounted at /api/webhook/evolution)
// Also handles sub-paths like /connection-update, /qrcode-updated, etc.
r.post(["/", "/*"], (req, res) => {
  // Respond immediately
  res.json({ received: true });

  // Process in background
  setImmediate(async () => {
    try {
      const body = req.body || {};
      const path = req.path;

      // DEBUG — remove after testing
      console.log(`[webhook] path: ${path} raw:`, JSON.stringify(body).slice(0, 300));

      // Evolution v2.2.0 sends different formats depending on WEBHOOK_BY_EVENTS:
      // BY_EVENTS=false → { event, instance, data, ... }
      // BY_EVENTS=true  → { event, instance, data, ... }
      // Sometimes instance is a string, sometimes an object
      // Evolution v2.2.0 sends different formats depending on WEBHOOK_BY_EVENTS
      const event = body.event;
      const data = body.data || body;
      const instanceName =
        typeof body.instance === "string"
          ? body.instance
          : body.instance?.instanceName || body.apikey || null;

      console.log(`[webhook] Event: ${event} for instance: ${instanceName}`);

      if (!event) return;

      // ----- messages.upsert -----
      if (event === "messages.upsert") {
        const key = data.key || {};
        const remoteJid = key.remoteJid;

        // Ignore own messages, groups, and broadcast
        if (key.fromMe === true) return;
        if (!remoteJid) return;
        if (remoteJid.includes("@g.us") || remoteJid.includes("status@broadcast")) return;

        // Lookup instance
        const waInstance = await prisma.whatsAppInstance.findFirst({
          where: { instanceName },
        });
        if (!waInstance) return;

        // Lookup agent with required includes
        const agent = await prisma.agent.findUnique({
          where: { id: waInstance.agentId },
          include: {
            provider: true,
            knowledgeFiles: { orderBy: { sortOrder: "asc" } },
          },
        });
        if (!agent || agent.status !== "active") return;

        let messageType = detectMessageType(data);
        let text = extractText(data);
        const pushName = data.pushName || null;
        const whatsappMsgId = key.id || null;

        // Reações: ignorar silenciosamente (não responder nada)
        if (messageType === "reaction") {
          console.log(`[webhook] reação ignorada de ${remoteJid}`);
          return;
        }

        // Áudio: baixar do Evolution e transcrever via Gemini
        if (messageType === "audio") {
          try {
            const audio = data.message?.audioMessage;
            const mimetype = audio?.mimetype || "audio/ogg";
            const { base64 } = await getMediaBase64(instanceName, data);
            if (!base64) throw new Error("base64 vazio");
            const transcribed = await transcribeAudio({ base64, mimetype });
            console.log(`[webhook] áudio transcrito (${transcribed.length} chars)`);
            text = transcribed || "";
            messageType = "text";
          } catch (err) {
            console.error("[webhook] falha ao transcrever áudio:", err.message || err);
            // Mantém messageType=audio → o conversation-manager responde a mensagem padrão
          }
        }

        bufferMessage({
          agent,
          instanceName,
          remoteJid,
          pushName,
          text,
          messageType,
          whatsappMsgId,
        });
      }

      // ----- connection.update -----
      else if (event === "connection.update") {
        const state = data.state || data.status; // Evolution v2 uses status sometimes
        if (!state || !instanceName) return;

        console.log(`[webhook] Connection state for ${instanceName}: ${state}`);

        const statusMap = { open: "connected", close: "disconnected", connecting: "connecting" };
        const newStatus = statusMap[state] || "connecting";

        const updateData = { status: newStatus };
        if (state === "open") updateData.connectedAt = new Date();
        if (data.wuid || data.ownerJid) {
          const jid = data.wuid || data.ownerJid;
          updateData.phoneNumber = jid.split("@")[0];
        }

        await prisma.whatsAppInstance.updateMany({
          where: { instanceName },
          data: updateData,
        });
      }

      // ----- qrcode.updated -----
      else if (event === "qrcode.updated" || event === "qrcode") {
        const base64 = stripDataUrl(data.qrcode?.base64 || data.base64 || data.code);
        if (!base64 || !instanceName) {
          console.log(`[webhook] Received qrcode event but no base64 or instance name. Keys: ${Object.keys(data)}`);
          return;
        }

        console.log(`[webhook] Received QR Code for ${instanceName} (length: ${base64.length})`);

        await prisma.whatsAppInstance.updateMany({
          where: { instanceName },
          data: { qrCode: base64, status: "qr_code" },
        });
      }
    } catch (err) {
      console.error("[webhook] background error:", err.message || err);
    }
  });
});

export default r;
