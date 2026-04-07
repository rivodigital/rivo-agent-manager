import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // limpa (order matters for FK constraints)
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.whatsAppInstance.deleteMany();
  await prisma.agentNote.deleteMany();
  await prisma.knowledgeFile.deleteMany();
  await prisma.usageLog.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.client.deleteMany();
  await prisma.provider.deleteMany();

  const provider = await prisma.provider.create({
    data: {
      name: "anthropic",
      label: "Anthropic (Claude)",
      apiKey: "sk-ant-PLACEHOLDER",
      status: "active",
      models: JSON.stringify([
        "claude-opus-4-6",
        "claude-sonnet-4-6",
        "claude-haiku-4-5-20251001",
      ]),
    },
  });

  const client = await prisma.client.create({
    data: {
      name: "ZR3 Empreendimentos",
      slug: "zr3-empreendimentos",
      segment: "Construtora/Incorporadora",
      contactName: "Equipe Comercial ZR3",
      contactEmail: "comercial@zr3.com.br",
      status: "active",
      notes: "Cliente piloto. Foco em qualificação de leads inbound (Instagram + site).",
    },
  });

  const agent = await prisma.agent.create({
    data: {
      clientId: client.id,
      providerId: provider.id,
      name: "Qualificador de Leads ZR3",
      slug: "qualificador-leads-zr3",
      description: "Recebe leads inbound, qualifica perfil e renda, agenda visita ou escala SDR.",
      model: "claude-sonnet-4-6",
      systemPrompt: `Você é o assistente virtual da ZR3 Empreendimentos, uma incorporadora premium.
Sua função é qualificar leads que chegam por WhatsApp e webchat.

Diretrizes:
- Tom cordial, profissional e direto. Português do Brasil.
- Sempre confirme nome, interesse (lançamento ou pronto), faixa de investimento e cidade.
- Nunca prometa preços ou prazos que não estejam na base de conhecimento.
- Se o lead estiver qualificado, ofereça agendamento de visita.
- Se desqualificado (fora da região/faixa), encerre com cordialidade.
- Em casos de dúvida técnica ou jurídica, escale para humano.`,
      temperature: 0.6,
      maxTokens: 1024,
      qualificationCriteria: JSON.stringify({
        campos: ["nome", "interesse", "faixa_investimento", "cidade"],
        desqualificadores: ["fora de SP capital", "investimento < 400k"],
      }),
      escalationRules: JSON.stringify({
        gatilhos: ["dúvida jurídica", "reclamação", "lead VIP"],
        canal: "whatsapp_sdr",
      }),
      responseGuidelines: JSON.stringify({
        idioma: "pt-BR",
        tom: "cordial-profissional",
        max_msg_chars: 600,
      }),
      implementationPhase: "live",
      status: "active",
      monthlyCostEstimate: 35,
      clientValueMetric: "leads qualificados/mês",
      deployedAt: new Date(),
      knowledgeFiles: {
        create: [
          {
            title: "Sobre a ZR3",
            category: "context",
            sortOrder: 0,
            content: "# Sobre a ZR3\n\nIncorporadora paulistana fundada em 2008, focada em empreendimentos residenciais de alto padrão na zona oeste de São Paulo.",
          },
          {
            title: "Empreendimentos Ativos",
            category: "product",
            sortOrder: 1,
            content: "# Empreendimentos\n\n- **Residencial Aurora** — Pinheiros, 2-3 dorms, entrega 2027\n- **Edifício Linea** — Vila Madalena, 1-2 dorms, pronto pra morar",
          },
          {
            title: "Perguntas Frequentes",
            category: "faq",
            sortOrder: 2,
            content: "# FAQ\n\n**Aceitam financiamento?** Sim, parceria com Itaú e Bradesco.\n\n**Tem decorado?** Sim, Aurora tem stand decorado em Pinheiros.",
          },
        ],
      },
      agentNotes: {
        create: [
          { type: "diagnosis", content: "Cliente recebia ~80 leads/semana sem triagem. SDR perdia 4h/dia respondendo lead frio." },
          { type: "adjustment", content: "Ajustado threshold de qualificação após semana 1 — muitos leads bons sendo descartados por critério de cidade rígido." },
        ],
      },
    },
  });

  // WhatsApp instance seed
  await prisma.whatsAppInstance.create({
    data: {
      agentId: agent.id,
      instanceName: "zr3-main",
      status: "disconnected",
    },
  });

  // Conversation seed with messages
  await prisma.conversation.create({
    data: {
      agentId: agent.id,
      remoteJid: "5547999887766@s.whatsapp.net",
      leadName: "João Silva",
      leadPhone: "+5547999887766",
      status: "qualified",
      qualificationScore: 85,
      qualificationData: JSON.stringify({
        interesse: "Apartamento 2 quartos",
        orcamento: "R$ 400-500k",
        prazo: "Próximos 6 meses",
        cidade: "Joinville",
      }),
      messages: {
        create: [
          { role: "user", content: "Oi, vi o anúncio do empreendimento novo de vocês" },
          { role: "assistant", content: "Olá João! Que bom que se interessou! Você está procurando apartamento para morar ou como investimento?" },
          { role: "user", content: "Para morar, estou procurando 2 quartos" },
          { role: "assistant", content: "Ótimo! Qual faixa de orçamento você considera?" },
          { role: "user", content: "Entre 400 e 500 mil" },
          { role: "assistant", content: "Temos o Residencial Aurora em Pinheiros nessa faixa. Posso agendar uma visita?" },
        ],
      },
    },
  });

  console.log("Seed ok:", { provider: provider.id, client: client.id, agent: agent.id });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
