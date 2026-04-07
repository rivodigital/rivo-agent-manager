# Rivo Agent Manager

Ferramenta interna de gestão de agentes de IA para a Rivo Digital. Centro de comando onde se gerencia agentes, clientes, bases de conhecimento e integração com WhatsApp via Evolution API.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20+ · Express · Prisma · SQLite |
| Frontend | React 18 · Vite · Tailwind CSS |
| WhatsApp | Evolution API v2.2.0 (self-hosted via Docker) |
| Cache | Redis 7 |
| LLM | Anthropic (Claude) via connector universal |

---

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Subir Evolution API + Redis + Postgres (apenas para Evolution)
docker-compose up -d

# 3. Rodar migrations e seed
cd backend
npx prisma migrate deploy
node prisma/seed.js
cd ..

# 4. Iniciar backend + frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **Evolution API:** http://localhost:8080

Auth: `Authorization: Bearer rivo-dev-token-2026`

---

## Variáveis de Ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste:

```env
DATABASE_URL="file:./dev.db"
PORT=3001
AUTH_TOKEN="rivo-dev-token-2026"

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=rivo-evolution-dev-key-change-me

# Redis
REDIS_URL=redis://localhost:6379

# Webhook
WEBHOOK_SECRET=rivo-webhook-secret-2026

# Fallback message (quando a LLM falha)
FALLBACK_MESSAGE="Desculpe, estou com dificuldades técnicas no momento. Um atendente entrará em contato em breve."

# Rate limit / buffering
MESSAGE_BUFFER_SECONDS=3
MAX_MESSAGES_PER_MINUTE=20
CONVERSATION_HISTORY_LIMIT=20
```

---

## Webhook: Expor localhost para a Evolution API

A Evolution API (rodando dentro do Docker) precisa enviar webhooks para o backend do Rivo. Em **dev local** isso já funciona automaticamente via `host.docker.internal` no `docker-compose.yml`:

```yaml
WEBHOOK_GLOBAL_URL: http://host.docker.internal:3001/api/webhook/evolution
```

### Quando precisa de túnel? (Produção / VPS / teste externo)

Se a Evolution API roda num servidor remoto ou se você precisa testar de fora da rede local, exponha o backend com um túnel:

#### Opção 1: ngrok (mais simples)

```bash
# Instalar
brew install ngrok   # macOS
# ou: https://ngrok.com/download

# Criar conta gratuita e autenticar
ngrok config add-authtoken SEU_TOKEN_AQUI

# Expor a porta do backend
ngrok http 3001
```

Copie a URL HTTPS gerada (ex: `https://abc123.ngrok-free.app`) e configure na Evolution API:

```bash
# Via docker-compose.yml: troque a WEBHOOK_GLOBAL_URL
WEBHOOK_GLOBAL_URL: https://abc123.ngrok-free.app/api/webhook/evolution

# Ou via API da Evolution diretamente:
curl -X POST http://localhost:8080/webhook/set/global \
  -H "apikey: rivo-evolution-dev-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://abc123.ngrok-free.app/api/webhook/evolution",
    "webhookByEvents": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
  }'
```

> **Nota:** a URL do ngrok muda a cada restart no plano gratuito. Considere o plano pago para domínio fixo.

#### Opção 2: Cloudflare Tunnel (gratuito, URL fixa possível)

```bash
# Instalar
brew install cloudflared   # macOS

# Modo rápido (URL temporária)
cloudflared tunnel --url http://localhost:3001

# Modo permanente (requer conta Cloudflare)
cloudflared tunnel login
cloudflared tunnel create rivo-webhook
cloudflared tunnel route dns rivo-webhook webhook.seudominio.com
cloudflared tunnel run rivo-webhook
```

A URL permanente fica algo como `https://webhook.seudominio.com`. Configure:

```
WEBHOOK_GLOBAL_URL: https://webhook.seudominio.com/api/webhook/evolution
```

#### Opção 3: localtunnel (zero setup)

```bash
npx localtunnel --port 3001 --subdomain rivo-webhook
# URL: https://rivo-webhook.loca.lt
```

> **Atenção:** localtunnel é instável para produção. Use apenas para testes rápidos.

### Verificar se o webhook está chegando

```bash
# Envie um POST de teste
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {}}'

# Resposta esperada:
# {"received": true}
```

O webhook é **público** (sem auth) — a Evolution API bate nele sem token.

---

## Arquitetura: Fluxo de Mensagem WhatsApp

```
Lead (WhatsApp)
    │ mensagem
    ▼
Evolution API (Docker :8080)
    │ webhook POST /api/webhook/evolution
    ▼
Rivo Backend (:3001)
    ├── Buffer de 3s (agrupa mensagens rápidas)
    ├── Identifica instância → agente
    ├── Busca histórico da conversa
    ├── Monta contexto: system prompt + knowledge base + histórico
    ├── Chama LLM (Anthropic Claude via connector.js)
    ├── Salva mensagem + resposta no banco
    ├── Avalia escalação
    └── Envia resposta via Evolution API
          │
          ▼
       Lead recebe resposta no WhatsApp
```

---

## Estrutura do Projeto

```
rivo-agent-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Schema completo (incl. WhatsApp models)
│   │   └── seed.js                 # Dados de exemplo
│   └── src/
│       ├── middleware/auth.js       # Bearer token auth
│       ├── routes/
│       │   ├── agents.js            # CRUD agentes
│       │   ├── agent-notes.js       # Notas do agente
│       │   ├── clients.js           # CRUD clientes
│       │   ├── conversations.js     # Conversas WhatsApp
│       │   ├── dashboard.js         # Estatísticas
│       │   ├── knowledge.js         # Base de conhecimento
│       │   ├── providers.js         # Provedores LLM
│       │   ├── webhook.js           # Webhook Evolution (público)
│       │   └── whatsapp.js          # Gestão de instâncias WA
│       ├── services/
│       │   ├── conversation-manager.js  # Processa mensagens → LLM → resposta
│       │   ├── evolution.js             # Client da Evolution API
│       │   ├── redis.js                 # Cache tolerante a falha
│       │   └── llm/
│       │       ├── connector.js         # Interface universal LLM
│       │       └── anthropic.js         # Plugin Anthropic
│       ├── db.js                    # PrismaClient singleton
│       └── server.js                # Express app
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx        # Mission Control + stats WhatsApp
│       │   ├── Clients.jsx          # Lista de clientes
│       │   ├── ClientDetail.jsx     # Detalhe + agentes do cliente
│       │   ├── Agents.jsx           # Lista de agentes
│       │   ├── AgentConfig.jsx      # Config agente (7 abas incl. WhatsApp)
│       │   ├── Conversations.jsx    # Histórico de conversas WA
│       │   └── Providers.jsx        # Provedores LLM
│       ├── components/
│       │   ├── layout/              # Sidebar, Layout
│       │   └── ui/                  # Badge, Modal
│       └── lib/
│           ├── api.js               # Axios wrapper
│           └── utils.js             # cn, statusColor
├── docker-compose.yml               # Evolution + Redis + Postgres
└── knowledge-base/                  # Diretório de markdown (futuro)
```

---

## API Endpoints

### Públicos (sem auth)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/webhook/evolution` | Webhook da Evolution API |
| GET | `/health` | Health check |

### Protegidos (Bearer token)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/stats` | Estatísticas gerais + WhatsApp |
| GET/POST | `/api/providers` | CRUD provedores LLM |
| GET/POST | `/api/clients` | CRUD clientes |
| GET/POST | `/api/agents` | CRUD agentes |
| GET/POST | `/api/agents/:id/knowledge` | Base de conhecimento |
| GET/POST | `/api/agents/:id/notes` | Notas do agente |
| GET | `/api/agents/:id/conversations` | Conversas do agente |
| GET/POST | `/api/whatsapp/instances` | Instâncias WhatsApp |
| GET/PUT | `/api/conversations` | Conversas |

---

## Dicas de Desenvolvimento

- **Parar o agente de responder:** mude `agent.status` para `paused` no dashboard — o webhook ignora silenciosamente
- **Chip de teste:** use um chip pré-pago separado para testes, nunca o WhatsApp pessoal
- **Redis offline:** o sistema funciona sem Redis (tolerante a falha), apenas o rate limiting/buffer fica desativado
- **Logs do webhook:** cheque o terminal do backend para `[webhook]` e `[conversation-manager]` logs
- **QR code não aparece:** verifique se a Evolution API está rodando (`docker ps`) e se a EVOLUTION_API_URL está correta no `.env`

---

## Checklist Fase 5

- [x] Docker Compose sobe Evolution API + Redis
- [x] Backend recebe webhooks e processa mensagens
- [x] Buffer de 3s agrupa mensagens rápidas
- [x] Contexto completo montado (system prompt + knowledge base + histórico)
- [x] LLM chamada via connector.js + resposta enviada ao lead
- [x] Conversas salvas no banco com mensagens
- [x] Aba "WhatsApp" no agente mostra QR code e status
- [x] Página de Conversas com filtros e chat
- [x] Dashboard mostra cards WhatsApp + conversas recentes
- [x] Tipos não suportados retornam mensagem educada
- [x] Erros da LLM retornam mensagem de fallback
- [x] Mensagens sem agente ativo ignoradas silenciosamente
