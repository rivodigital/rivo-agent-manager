import axios from "axios";

// Remove o prefixo "data:image/png;base64," se vier — o frontend já adiciona
export function stripDataUrl(b64) {
  if (!b64) return null;
  const s = String(b64);
  const i = s.indexOf("base64,");
  return i >= 0 ? s.slice(i + 7) : s;
}

function client() {
  const baseURL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
  const apikey = process.env.EVOLUTION_API_KEY || "";
  return axios.create({
    baseURL,
    headers: { apikey, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

export async function createInstance(instanceName) {
  const webhookUrl = process.env.WEBHOOK_GLOBAL_URL || "http://host.docker.internal:3001/api/webhook/evolution";
  const { data } = await client().post("/instance/create", {
    instanceName,
    token: process.env.EVOLUTION_API_KEY,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    webhook: {
      url: webhookUrl,
      byEvents: false,
      base64: true,
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"]
    }
  });
  return data;
}

export async function deleteInstance(instanceName) {
  try {
    await client().delete(`/instance/logout/${instanceName}`);
  } catch {}
  const { data } = await client().delete(`/instance/delete/${instanceName}`);
  return data;
}

export async function getConnectionState(instanceName) {
  const { data } = await client().get(`/instance/connectionState/${instanceName}`);
  return data;
}

export async function connectInstance(instanceName) {
  // Gera novo QR code / reconecta
  const { data } = await client().get(`/instance/connect/${instanceName}`);
  return data;
}

export async function fetchAllInstances() {
  const { data } = await client().get(`/instance/fetchInstances`);
  return data;
}

export async function sendText(instanceName, number, text) {
  // number: "5547999999999" (sem @s.whatsapp.net)
  const { data } = await client().post(`/message/sendText/${instanceName}`, {
    number,
    text,
  });
  return data;
}

// Converte remoteJid "5547999999999@s.whatsapp.net" → "5547999999999"
export function jidToNumber(jid) {
  if (!jid) return null;
  return String(jid).split("@")[0];
}
