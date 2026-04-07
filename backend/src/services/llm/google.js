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

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text();
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

  if (!text && candidate?.finishReason === "SAFETY") {
    throw new Error("google: resposta bloqueada por filtro de segurança");
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
