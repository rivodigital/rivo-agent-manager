const INTEREST_KEYWORDS = ["orçamento", "proposta", "quanto custa", "contratar", "fechar", "comprar", "adquirir", "investir", "valor", "preço"];
const NAME_PATTERNS = [/meu nome é/i, /me chamo/i, /sou o/i, /sou a/i, /nome:\s*/i, /nome\s*:/i];
const COMPANY_PATTERNS = [/empresa/i, /organização/i, /organizacao/i, /corporação/i, /corporacao/i, /negócio/i, /negocio/i, /loja/i, /imobiliária/i, /imobiliaria/i, /escritório/i, /escritorio/i];
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w{2,}/;
const PHONE_PATTERN = /(?:\+?\d{2}\s?)?\(?\d{2}\)?\s?\d{4,5}[\s-]?\d{4}/;

export function calculateLeadScore(conversation, messages) {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const userText = userMessages.map((m) => m.content).join(" ");
  const allText = messages.map((m) => m.content).join(" ");
  const lowerText = userText.toLowerCase();

  const breakdown = {
    name: false,
    company: false,
    need: false,
    urgency: false,
    contact: false,
    interest: false,
    responseCount: false,
    backAndForth: false,
    mediaSent: false,
  };

  if (NAME_PATTERNS.some((p) => p.test(userText)) || (conversation.leadName && conversation.leadName !== "Sem nome" && conversation.leadName.length > 2)) {
    breakdown.name = true;
  }

  if (COMPANY_PATTERNS.some((p) => p.test(userText))) {
    breakdown.company = true;
  }

  if (/precis|quero|busc|gostaria|interesse|desej|necessit/i.test(userText)) {
    breakdown.need = true;
  }

  if (/urgente|pressa|rápido|rapido|prazo|amanhã|amanha|essa semana|esse mês|esse mes|até.*dia|até.*semana|até.*mês|até.*mes/i.test(userText)) {
    breakdown.urgency = true;
  }

  if (EMAIL_PATTERN.test(allText) || PHONE_PATTERN.test(allText) || userMessages.length >= 2) {
    breakdown.contact = true;
  }

  if (INTEREST_KEYWORDS.some((kw) => lowerText.includes(kw))) {
    breakdown.interest = true;
  }

  if (userMessages.length > 3) {
    breakdown.responseCount = true;
  }

  const totalExchanges = Math.min(userMessages.length, assistantMessages.length);
  if (totalExchanges > 5) {
    breakdown.backAndForth = true;
  }

  const hasMedia = messages.some((m) => m.messageType && !["text", "unknown"].includes(m.messageType));
  if (hasMedia) {
    breakdown.mediaSent = true;
  }

  const score =
    (breakdown.name ? 10 : 0) +
    (breakdown.company ? 10 : 0) +
    (breakdown.need ? 15 : 0) +
    (breakdown.urgency ? 10 : 0) +
    (breakdown.contact ? 10 : 0) +
    (breakdown.interest ? 15 : 0) +
    (breakdown.responseCount ? 10 : 0) +
    (breakdown.backAndForth ? 10 : 0) +
    (breakdown.mediaSent ? 10 : 0);

  return { score: Math.min(score, 100), breakdown };
}
