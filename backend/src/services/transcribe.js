// Transcrição de áudio via Gemini (inline audio em generateContent).
// Usa o provider Google cadastrado pra pegar a API key.
import { prisma } from "../db.js";

const TRANSCRIBE_MODEL = "gemini-2.5-flash";

export async function transcribeAudio({ base64, mimetype }) {
  // Pega a key do provider Google ativo
  const provider = await prisma.provider.findFirst({
    where: { name: "google", status: "active" },
  });
  if (!provider) throw new Error("provider google não cadastrado/ativo");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TRANSCRIBE_MODEL}:generateContent?key=${provider.apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mimetype || "audio/ogg", data: base64 } },
          {
            text:
              "Transcreva este áudio fielmente em português brasileiro. " +
              "Retorne APENAS o texto transcrito, sem comentários, sem aspas, sem prefixos.",
          },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 1024 },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`transcribe ${r.status}: ${txt.slice(0, 300)}`);
  }
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();
  return text;
}
