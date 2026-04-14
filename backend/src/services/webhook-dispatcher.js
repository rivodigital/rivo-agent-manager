import { prisma } from "../db.js";
import dns from "node:dns/promises";
import net from "node:net";

/**
 * Returns true if the given IPv4 or IPv6 address is in a blocked range.
 * Blocked: loopback, link-local, private (RFC-1918), ULA (fc00::/7), 0.0.0.0.
 */
function isBlockedIp(ip) {
  if (!ip) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x) — unwrap to plain IPv4
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const addr = v4mapped ? v4mapped[1] : ip;

  if (net.isIPv4(addr)) {
    const parts = addr.split(".").map(Number);
    const [a, b] = parts;
    if (addr === "0.0.0.0") return true;
    if (a === 127) return true;                           // 127.0.0.0/8  loopback
    if (a === 169 && b === 254) return true;              // 169.254.0.0/16 link-local / AWS metadata
    if (a === 10) return true;                            // 10.0.0.0/8   private
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true;              // 192.168.0.0/16 private
    return false;
  }

  if (net.isIPv6(addr)) {
    const lower = addr.toLowerCase();
    if (lower === "::1") return true;                     // loopback
    if (lower.startsWith("fe80")) return true;            // fe80::/10 link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 ULA
    return false;
  }

  return true; // unknown format — block by default
}

/**
 * Validates a webhook URL for SSRF safety.
 * - Only http: and https: schemes allowed.
 * - In production, resolves the hostname and blocks private/internal IPs.
 * Throws an Error if the URL is unsafe.
 */
export async function validateWebhookUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Scheme '${parsed.protocol}' is not allowed`);
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return; // allow loopback in dev for local testing

  // Reject bare IPs that are already blocked without DNS lookup
  if (net.isIP(parsed.hostname) && isBlockedIp(parsed.hostname)) {
    throw new Error("SSRF blocked: target IP is in a restricted range");
  }

  // Resolve hostname → check every returned address
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error("SSRF blocked: hostname could not be resolved");
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new Error(`SSRF blocked: '${parsed.hostname}' resolves to restricted IP ${address}`);
    }
  }
}

export async function dispatchWebhook(agentId, event, payload) {
  try {
    const configs = await prisma.webhookConfig.findMany({
      where: { agentId, active: true },
    });

    for (const config of configs) {
      let events;
      try {
        events = JSON.parse(config.events);
      } catch {
        continue;
      }

      if (!events.includes(event)) continue;

      let headers = {};
      try {
        if (config.headers) headers = JSON.parse(config.headers);
      } catch { /* ignore invalid headers */ }

      const body = {
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      };

      // SSRF guard — validate before any network call
      try {
        await validateWebhookUrl(config.url);
      } catch (ssrfErr) {
        console.error(`[webhook-dispatcher] SSRF blocked: ${ssrfErr.message} (url=${config.url})`);
        continue;
      }

      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      };

      try {
        const response = await fetch(config.url, fetchOptions);
        // Discard body — we only care about the status code
        await response.body?.cancel();

        if (!response.ok) {
          console.warn(`[webhook-dispatcher] ${event} to ${config.url} failed: ${response.status}`);
        }
      } catch (err) {
        console.error(`[webhook-dispatcher] ${event} to ${config.url} error:`, err.message || err);
        // Retry once after 2 seconds
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Re-validate before retry (DNS TTL may have changed, but avoids bypass)
          await validateWebhookUrl(config.url);
          const retryResponse = await fetch(config.url, { ...fetchOptions, signal: AbortSignal.timeout(10000) });
          await retryResponse.body?.cancel();
          if (!retryResponse.ok) {
            console.warn(`[webhook-dispatcher] ${event} retry to ${config.url} failed: ${retryResponse.status}`);
          }
        } catch (retryErr) {
          console.error(`[webhook-dispatcher] ${event} retry to ${config.url} error:`, retryErr.message || retryErr);
        }
      }
    }
  } catch (err) {
    console.error("[webhook-dispatcher] error:", err.message || err);
  }
}
