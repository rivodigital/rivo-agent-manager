import Redis from "ioredis";

let client = null;

export function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on("error", (e) => {
    // silencia ruído quando Redis não está up em dev
    if (!client._warned) {
      console.warn("[redis] indisponível:", e.code || e.message);
      client._warned = true;
    }
  });
  client.connect().catch(() => {});
  return client;
}

export async function safeGet(key) {
  try { return await getRedis().get(key); } catch { return null; }
}
export async function safeSet(key, value, ttlSeconds) {
  try {
    if (ttlSeconds) await getRedis().set(key, value, "EX", ttlSeconds);
    else await getRedis().set(key, value);
    return true;
  } catch { return false; }
}
export async function safeDel(key) {
  try { await getRedis().del(key); return true; } catch { return false; }
}

// Rate limit simples: true = permitido, false = bloqueado
export async function rateLimitCheck(key, max, windowSeconds) {
  try {
    const r = getRedis();
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, windowSeconds);
    return n <= max;
  } catch {
    return true; // se Redis cair, não bloqueia
  }
}
