// Chat real contra a Gemini API do Google.
// Usa a REST API diretamente (sem SDK) — mesmo padrão do anthropic.js.
// Docs: https://ai.google.dev/api/generate-content

export async function chat({ apiKey, model, systemPrompt, messages, temperature = 0.7, maxTokens = 2048 }) {
  // Mapear messages para o formato Gemini (contents/parts)
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  // System instruction (Gemini aceita como campo separado)
  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Retry com backoff em 429/503 (sobrecarga do Gemini)
  let r;
  let lastErr;
  const delays = [800, 2000, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) break;
    if (r.status !== 429 && r.status !== 503) break;
    lastErr = await r.text();
    if (attempt < delays.length) {
      await new Promise((res) => setTimeout(res, delays[attempt]));
    }
  }

  if (!r.ok) {
    const txt = lastErr || (await r.text());
    throw new Error(`google ${r.status}: ${txt.slice(0, 300)}`);
  }

  const data = await r.json();

  // Extrair texto da resposta
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();

  if (!text) {
    const reason = candidate?.finishReason || "unknown";
    console.warn(`[google] resposta vazia finishReason=${reason} model=${model}`);
    if (reason === "SAFETY") throw new Error("google: resposta bloqueada por filtro de segurança");
    if (reason === "RECITATION") throw new Error("google: resposta bloqueada por RECITATION");
    if (reason === "MAX_TOKENS") throw new Error("google: resposta cortada por MAX_TOKENS");
  }

  return {
    text,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
    raw: data,
  };
}
