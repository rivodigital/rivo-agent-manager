import { prisma } from "../db.js";

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

      try {
        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          console.warn(`[webhook-dispatcher] ${event} to ${config.url} failed: ${response.status}`);
        } else {
          console.log(`[webhook-dispatcher] ${event} sent to ${config.url}: ${response.status}`);
        }
      } catch (err) {
        console.error(`[webhook-dispatcher] ${event} to ${config.url} error:`, err.message || err);
        // Retry once after 2 seconds
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const retryResponse = await fetch(config.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(body),
          });
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
