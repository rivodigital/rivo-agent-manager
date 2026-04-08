// Transcrição de áudio via Gemini (inline audio em generateContent).
// Usa o provider Google cadastrado pra pegar a API key.
import { prisma } from "../db.js";

// Ordem de tentativa: modelos menores primeiro (mais baratos + menos sobrecarregados)
const TRANSCRIBE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

export async function transcribeAudio({ base64, mimetype }) {
  // Pega a key do provider Google ativo
  const provider = await prisma.provider.findFirst({
    where: { name: "google", status: "active" },
  });
  if (!provider) throw new Error("provider google não cadastrado/ativo");

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

  const delays = [800, 2000, 4000];
  let lastErr;

  // Tenta cada modelo, com retry em 429/503 antes de cair pro próximo
  for (const model of TRANSCRIBE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      let r;
      try {
        r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (netErr) {
        lastErr = `transcribe ${model} network: ${netErr.message}`;
        break;
      }

      if (r.ok) {
        const data = await r.json();
        const text = (data.candidates?.[0]?.content?.parts || [])
          .filter((p) => p.text)
          .map((p) => p.text)
          .join("\n")
          .trim();
        if (model !== TRANSCRIBE_MODELS[0]) {
          console.warn(`[transcribe] fallback pro modelo ${model}`);
        }
        return text;
      }

      const txt = await r.text();
      lastErr = `transcribe ${model} ${r.status}: ${txt.slice(0, 200)}`;

      // Só vale a pena retry em 429/503
      if (r.status !== 429 && r.status !== 503) break;
      if (attempt < delays.length) {
        await new Promise((res) => setTimeout(res, delays[attempt]));
      }
    }
  }

  throw new Error(lastErr || "transcribe: todos os modelos falharam");
}
