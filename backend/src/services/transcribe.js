// Chamadas multimodais ao Gemini: transcrição de áudio e leitura de imagens.
// Usa o provider Google cadastrado pra pegar a API key.
import { prisma } from "../db.js";

// Ordem de tentativa: modelos menores primeiro (mais baratos + menos sobrecarregados)
const MULTIMODAL_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// Chama Gemini com retry + fallback entre modelos. Retorna o texto da resposta.
async function runGemini({ parts, maxTokens = 1024, label = "gemini" }) {
  const provider = await prisma.provider.findFirst({
    where: { name: "google", status: "active" },
  });
  if (!provider) throw new Error("provider google não cadastrado/ativo");

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
  };

  const delays = [800, 2000, 4000];
  let lastErr;

  for (const model of MULTIMODAL_MODELS) {
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
        lastErr = `${label} ${model} network: ${netErr.message}`;
        break;
      }

      if (r.ok) {
        const data = await r.json();
        const text = (data.candidates?.[0]?.content?.parts || [])
          .filter((p) => p.text)
          .map((p) => p.text)
          .join("\n")
          .trim();
        if (model !== MULTIMODAL_MODELS[0]) {
          console.warn(`[${label}] fallback pro modelo ${model}`);
        }
        return text;
      }

      const txt = await r.text();
      lastErr = `${label} ${model} ${r.status}: ${txt.slice(0, 200)}`;

      if (r.status !== 429 && r.status !== 503) break;
      if (attempt < delays.length) {
        await new Promise((res) => setTimeout(res, delays[attempt]));
      }
    }
  }

  throw new Error(lastErr || `${label}: todos os modelos falharam`);
}

export async function transcribeAudio({ base64, mimetype }) {
  return runGemini({
    label: "transcribe",
    maxTokens: 1024,
    parts: [
      { inlineData: { mimeType: mimetype || "audio/ogg", data: base64 } },
      {
        text:
          "Transcreva este áudio fielmente em português brasileiro. " +
          "Retorne APENAS o texto transcrito, sem comentários, sem aspas, sem prefixos.",
      },
    ],
  });
}

export async function analyzeImage({ base64, mimetype, caption }) {
  const capText = caption?.trim()
    ? `O cliente enviou esta imagem junto com a legenda: "${caption.trim()}".`
    : "O cliente enviou esta imagem sem legenda.";

  const description = await runGemini({
    label: "vision",
    maxTokens: 512,
    parts: [
      { inlineData: { mimeType: mimetype || "image/jpeg", data: base64 } },
      {
        text:
          `${capText} ` +
          "Descreva de forma objetiva e curta o que há na imagem em português brasileiro, " +
          "destacando qualquer texto visível, produtos, objetos, contexto relevante, " +
          "números, preços ou informações úteis pra um atendimento. " +
          "Retorne APENAS a descrição, sem prefixos ou introduções.",
      },
    ],
  });

  // Formato pronto pra injetar no histórico como mensagem do usuário
  if (caption?.trim()) {
    return `[Imagem enviada pelo cliente — ${description}]\n\nLegenda: ${caption.trim()}`;
  }
  return `[Imagem enviada pelo cliente — ${description}]`;
}
