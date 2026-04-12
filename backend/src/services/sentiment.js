const NEGATIVE_WORDS = [
  "péssimo", "horrível", "terrível", "absurdo", "inaceitável", "vergonha",
  "lixo", "porcaria", "merda", "droga", "desgraça", "raiva", "irritado",
  "frustrado", "decepcionado", "insatisfeito", "reclamação", "nunca mais",
  "cancelar", "processo", "procon", "advogado", "pessimo", "horivel",
  "inaceitavel", "vergonha", "reclamacao",
];

const POSITIVE_WORDS = [
  "ótimo", "excelente", "perfeito", "maravilhoso", "incrível", "adorei",
  "amei", "obrigado", "obrigada", "parabéns", "satisfeito", "contente",
  "feliz", "top", "show", "demais", "otimo", "incrivel", "parabens",
];

const FRUSTRATED_SIGNALS = [
  "!!!", "???", "não funciona", "nao funciona", "não resolve", "nao resolve",
  "já falei", "ja falei", "de novo", "outra vez", "cansado", "cansada",
];

export function detectSentiment(text) {
  if (!text || text.trim().length === 0) {
    return { sentiment: "neutral", confidence: "low" };
  }

  const lower = text.toLowerCase();

  let frustratedCount = 0;
  for (const signal of FRUSTRATED_SIGNALS) {
    if (lower.includes(signal)) frustratedCount++;
  }

  const upperChars = text.replace(/[^A-ZÀ-Ú]/g, "");
  const alphaChars = text.replace(/[^A-Za-zÀ-ú]/g, "");
  const isMostlyCaps = alphaChars.length > 5 && (upperChars.length / alphaChars.length) > 0.5;
  if (isMostlyCaps) frustratedCount++;

  let negativeCount = 0;
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) negativeCount++;
  }

  let positiveCount = 0;
  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) positiveCount++;
  }

  if (frustratedCount > 0) {
    return { sentiment: "frustrated", confidence: frustratedCount > 1 ? "high" : "medium" };
  }

  if (negativeCount > positiveCount) {
    return { sentiment: "negative", confidence: negativeCount > 1 ? "high" : "medium" };
  }

  if (positiveCount > negativeCount) {
    return { sentiment: "positive", confidence: positiveCount > 1 ? "high" : "medium" };
  }

  return { sentiment: "neutral", confidence: "low" };
}
