import * as anthropic from "./anthropic.js";
import * as google from "./google.js";

// Chat universal — despacha pro plugin do provider.
// Implementado: anthropic, google. Outros = stub (lançam erro claro).
export async function chat({ provider, model, systemPrompt, messages, temperature, maxTokens }) {
  if (!provider) throw new Error("provider required");
  const apiKey = provider.apiKey;
  switch (provider.name) {
    case "anthropic":
      return anthropic.chat({ apiKey, model, systemPrompt, messages, temperature, maxTokens });
    case "google":
      return google.chat({ apiKey, model, systemPrompt, messages, temperature, maxTokens });
    case "openai":
    case "groq":
    case "openrouter":
      throw new Error(`chat() ainda não implementado para provider "${provider.name}" — use anthropic ou google por enquanto`);
    default:
      throw new Error(`provider desconhecido: ${provider.name}`);
  }
}

// Universal LLM connector — placeholder.
// testConnection performs a lightweight check per provider name.
export async function testConnection({ name, apiKey, baseUrl }) {
  if (!apiKey) return { ok: false, error: "missing apiKey" };
  try {
    switch (name) {
      case "anthropic": {
        const r = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        });
        return { ok: r.ok, status: r.status };
      }
      case "openai": {
        const r = await fetch((baseUrl || "https://api.openai.com") + "/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { ok: r.ok, status: r.status };
      }
      case "groq": {
        const r = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { ok: r.ok, status: r.status };
      }
      case "openrouter": {
        const r = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return { ok: r.ok, status: r.status };
      }
      case "google": {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        return { ok: r.ok, status: r.status };
      }
      default:
        return { ok: true, note: "no test implemented for provider" };
    }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
