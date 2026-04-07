// Chat real contra a Messages API da Anthropic.
// messages: [{ role: "user"|"assistant", content: "..." }]
export async function chat({ apiKey, model, systemPrompt, messages, temperature = 0.7, maxTokens = 1024 }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || undefined,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`anthropic ${r.status}: ${txt.slice(0, 300)}`);
  }
  const data = await r.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    text,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    raw: data,
  };
}
