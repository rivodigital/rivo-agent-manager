# RIVO Agent Manager — Auditoria: Plano de Tarefas

Plano de melhorias de **segurança, limpeza e otimização** sobre o estado atual do repo. Cada tarefa é auto-contida e foi escrita pra ser executada por um agente e revisada em seguida.

**Ordem recomendada de execução:**
1. Task 1 — SSRF protection no webhook-dispatcher 🔴
2. Task 2 — Rate limit no `/auth/login` 🔴
3. Task 3 — React Error Boundary 🔴
4. Task 4 — Índices no Prisma schema 🔴
5. Task 5 — Validação de env vars no startup 🟠
6. Task 9 — Sanitizar error handler 🟡
7. Task 11 — Criar `.env.example` 🟢
8. Task 6 — CORS restrito 🟠
9. Task 7 — Rate limit → Redis 🟡
10. Task 10 — Backup automático SQLite 🟡
11. Task 12 — Code-split por rota no frontend 🟢
12. Task 8 — Split de `AgentConfig.jsx` 🟡 *(por último — risco alto de regressão)*

Legenda: 🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo

---

## Task 1 — SSRF protection no webhook-dispatcher 🔴

**Contexto:** O backend aceita URLs de webhook definidas pelo usuário e faz `fetch()` direto. Isso permite SSRF — um usuário pode apontar a URL pra `http://169.254.169.254/` (metadata da cloud), `http://localhost:5432`, `http://10.0.0.1`, etc., e o servidor vai buscar por ele.

**Arquivo:** `backend/src/services/webhook-dispatcher.js`

**O que fazer:**
1. Antes de cada `fetch()`, validar a URL:
   - Só aceitar `http:` ou `https:` (rejeitar `file:`, `gopher:`, `ftp:`, etc.)
   - Resolver o hostname via `dns.promises.lookup()` e rejeitar se o IP resolvido for:
     - Loopback (`127.0.0.0/8`, `::1`)
     - Link-local (`169.254.0.0/16`, `fe80::/10`) — bloqueia metadata AWS/GCP
     - Privado (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`)
     - `0.0.0.0`
   - Em produção (`NODE_ENV === 'production'`), aplicar o bloqueio. Em dev, permitir loopback pra facilitar teste local com ngrok/webhook.site.
2. Adicionar timeout de 10s no `fetch()` via `AbortSignal.timeout(10000)`.
3. Limitar o tamanho da resposta lida — não precisa processar o body do webhook, só checar status. Descartar o body.
4. Na validação da URL no momento do **cadastro** do webhook (em `backend/src/routes/webhooks.js` ou onde o webhook é salvo), rejeitar URLs inválidas com 400 antes de salvar no DB.

**NÃO faça:**
- ❌ Não use bibliotecas externas tipo `ssrf-req-filter` — implementa com `node:dns` e `node:net` (já vêm com Node).
- ❌ Não mude a assinatura pública das funções do dispatcher — só adicione validação interna.
- ❌ Não remova o retry de 1 tentativa que já existe.
- ❌ Não toque em outros arquivos além do dispatcher e da rota de cadastro de webhook.
- ❌ Não adicione console.logs novos — use o logger existente se houver, ou deixe silencioso.

**Critério de aceite:**
- POST de webhook com URL `http://127.0.0.1:8080/x` em produção → não dispara fetch, loga erro "SSRF blocked".
- POST com URL `http://169.254.169.254/latest/meta-data/` → bloqueado.
- POST com URL `file:///etc/passwd` → bloqueado no cadastro (400).
- POST com URL pública normal → funciona como antes.
- Cadastro de webhook com URL inválida retorna 400 antes de salvar.
- Nenhuma regressão no fluxo atual de envio.

---

## Task 2 — Rate limit no `/auth/login` 🔴

**Contexto:** A rota de login não tem rate limit. Permite brute force de senhas sem qualquer barreira.

**Arquivo:** `backend/src/routes/auth.js` (e provavelmente `backend/src/server.js` pra registrar o middleware)

**O que fazer:**
1. Usar `express-rate-limit` (já pode estar no `package.json` — se não, adicionar).
2. Criar um limiter específico pro login:
   - Janela: 15 minutos
   - Máximo: 10 tentativas por IP
   - Resposta 429 com mensagem genérica ("Muitas tentativas, tente novamente em alguns minutos")
   - `standardHeaders: true`, `legacyHeaders: false`
3. Aplicar apenas no endpoint `POST /auth/login` (não em outras rotas de auth).
4. Usar `req.ip` como chave. Se houver proxy (Caddy), garantir que `app.set('trust proxy', 1)` está configurado em `server.js` pra pegar o IP real.

**NÃO faça:**
- ❌ Não aplique rate limit global em `/api` nessa task — isso é a Task 7.
- ❌ Não troque pra Redis agora — fica em memória mesmo (Task 7 faz a migração).
- ❌ Não adicione captcha, 2FA ou bloqueio de conta — escopo é só rate limit.

**Critério de aceite:**
- 11ª tentativa de login do mesmo IP em 15min retorna 429.
- Após 15min, contador zera.
- Login normal continua funcionando.
- Header `RateLimit-Remaining` aparece nas respostas.

---

## Task 3 — React Error Boundary 🔴

**Contexto:** Qualquer erro de render em qualquer componente leva a tela branca total (já aconteceu). Não há fallback UI.

**Arquivos:** `frontend/src/App.jsx` (ou onde as rotas são montadas), novo `frontend/src/components/ErrorBoundary.jsx`

**O que fazer:**
1. Criar `ErrorBoundary.jsx` como class component com:
   - `getDerivedStateFromError(error)` → set `{ hasError: true, error }`
   - `componentDidCatch(error, info)` → `console.error` com o erro + component stack
   - Fallback UI: card centralizado com título "Algo deu errado", botão "Recarregar" (`window.location.reload()`) e mensagem do erro em `<pre>` (só em dev — em prod, ocultar).
2. Envolver o `<RouterProvider>` / `<Routes>` em `App.jsx` com `<ErrorBoundary>`.
3. Opcional: envolver cada rota individualmente também, pra que erro numa tela não derrube o sidebar/layout. Se for fácil, faz.

**NÃO faça:**
- ❌ Não adicione Sentry/Bugsnag/etc. — só boundary local.
- ❌ Não mude o roteamento existente.
- ❌ Não esconda o erro em dev — desenvolvedor precisa ver.

**Critério de aceite:**
- Forçar um `throw new Error('teste')` num componente de rota não quebra a aplicação inteira — aparece o fallback UI.
- Botão "Recarregar" funciona.
- Sidebar continua visível se o boundary estiver no nível da rota.
- Em prod, mensagem do erro não é exibida ao usuário.

---

## Task 4 — Índices no Prisma schema 🔴

**Contexto:** O schema não tem índices explícitos além de PKs/FKs implícitas. Queries por `clientId`, `agentId`, `createdAt`, `status` vão ficar lentas conforme a base cresce.

**Arquivo:** `backend/prisma/schema.prisma`

**O que fazer:**
1. Adicionar `@@index` nos campos mais consultados:
   - `Message`: `[conversationId, createdAt]`
   - `Conversation`: `[agentId, updatedAt]`, `[clientId]`
   - `UsageLog`: `[agentId, createdAt]`, `[createdAt]`
   - `FollowUp`: `[scheduledAt, status]`
   - `Blocklist`: `[identifier]` (se não for único)
   - `AgentNote`: `[agentId, createdAt]`
   - `WebhookConfig`: `[agentId]`
2. Rodar `npx prisma migrate dev --name add_indexes` pra gerar a migration.
3. Commitar a migration junto com o schema.

**NÃO faça:**
- ❌ Não renomeie campos, models ou relacionamentos.
- ❌ Não adicione campos novos.
- ❌ Não apague dados.
- ❌ Não mude de SQLite pra Postgres nessa task.
- ❌ Não crie índices em campos de texto longo sem ser por prefixo — SQLite não suporta bem.

**Critério de aceite:**
- Migration gerada e aplicada sem erro.
- `npx prisma migrate status` mostra tudo em ordem.
- App sobe normal, queries retornam os mesmos resultados.
- `EXPLAIN QUERY PLAN` em uma query de mensagens por conversa mostra uso do índice.

---

## Task 5 — Validação de env vars no startup 🟠

**Contexto:** Hoje, se `JWT_SECRET`, `DATABASE_URL` ou outras envs críticas faltarem, o app sobe e só quebra quando alguém tenta logar. Melhor falhar rápido.

**Arquivo:** novo `backend/src/config/env.js` (ou similar), e importar em `backend/src/server.js` como primeira linha depois dos imports.

**O que fazer:**
1. Criar um módulo que valida no startup:
   - `JWT_SECRET` — obrigatória, mínimo 32 chars
   - `DATABASE_URL` — obrigatória
   - `NODE_ENV` — default `development`
   - `PORT` — default `3000`, deve ser numérico
   - Outras que o backend já usa (procurar `process.env.` no codebase)
2. Se faltar alguma, `console.error` com lista das que faltam e `process.exit(1)`.
3. Exportar um objeto `config` tipado (JSDoc) com os valores validados, pra que o resto do código importe de lá em vez de `process.env` direto. **Mas** não refatora todo o código agora — só faz o objeto existir e valida. Refactor pra usar `config.X` é incremental.

**NÃO faça:**
- ❌ Não use `zod`, `joi` ou outra lib de validação — validação manual é suficiente aqui.
- ❌ Não mude código existente pra usar o `config` — só crie e valide.
- ❌ Não adicione `.env.example` aqui (é a Task 11).

**Critério de aceite:**
- Subir sem `JWT_SECRET` → app falha imediatamente com mensagem clara.
- Subir com `JWT_SECRET="curta"` → falha por tamanho.
- Subir com env completa → funciona igual.

---

## Task 6 — CORS restrito 🟠

**Contexto:** `server.js` tem `app.use(cors())` sem opções — libera qualquer origem.

**Arquivo:** `backend/src/server.js`

**O que fazer:**
1. Adicionar env var `CORS_ORIGINS` (lista separada por vírgula).
2. Configurar CORS:
   ```js
   const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
   app.use(cors({
     origin: (origin, cb) => {
       if (!origin) return cb(null, true); // server-to-server
       if (allowed.includes(origin)) return cb(null, true);
       cb(new Error('CORS blocked'));
     },
     credentials: true,
   }));
   ```
3. Adicionar `CORS_ORIGINS` no `.env.example` (se Task 11 já tiver sido feita) e no deploy.

**NÃO faça:**
- ❌ Não remova CORS completamente.
- ❌ Não hardcode origens no código — sempre via env.
- ❌ Não aplique CORS diferente por rota.

**Critério de aceite:**
- Request de origem não listada → bloqueado.
- Request do frontend em produção (origem configurada) → funciona.
- Requests sem `Origin` (curl, server-to-server) → funcionam.

---

## Task 7 — Rate limit migrado pra Redis 🟡

**Contexto:** Rate limit em memória funciona só num processo. Se escalar (múltiplas instâncias) ou reiniciar, contador zera.

**Dependência:** Task 2 já deve estar feita.

**Arquivos:** `backend/src/server.js`, `backend/package.json`

**O que fazer:**
1. Adicionar `rate-limit-redis` e `ioredis`.
2. Configurar store Redis no limiter:
   ```js
   import RedisStore from 'rate-limit-redis';
   import Redis from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   const store = new RedisStore({ sendCommand: (...args) => redis.call(...args) });
   ```
3. `REDIS_URL` em env — se vazio, cair pro in-memory (fallback dev).
4. Atualizar `docker-compose.prod.yml` adicionando serviço Redis.

**NÃO faça:**
- ❌ Não use Redis pra session/cache/outras coisas nessa task — só rate limit.
- ❌ Não exponha Redis publicamente.
- ❌ Não remova o limiter in-memory como fallback.

**Critério de aceite:**
- Duas instâncias do backend rodando compartilham o contador.
- Se Redis cair, app continua subindo (fallback in-memory).
- `docker-compose.prod.yml` sobe Redis junto.

---

## Task 8 — Split de `AgentConfig.jsx` 🟡 *(última — risco alto)*

**Contexto:** `frontend/src/pages/AgentConfig.jsx` tem 1040+ linhas e várias abas (Tab*) dentro. Difícil manter, fácil quebrar (como já aconteceu).

**Arquivo:** `frontend/src/pages/AgentConfig.jsx`

**O que fazer:**
1. Extrair cada `Tab*` pra um arquivo próprio em `frontend/src/pages/agent-config/`:
   - `TabGeneral.jsx`, `TabKnowledge.jsx`, `TabWhatsApp.jsx`, `TabNotes.jsx`, `TabWebhooks.jsx`, etc. (usar os nomes reais das abas existentes)
2. `AgentConfig.jsx` fica só com: estado global do agente, fetch do agente, switch de abas, header.
3. Props: cada Tab recebe `agent`, `onUpdate` (ou `refetch`), `clientId` — o mínimo necessário. Não drill props que a Tab não usa.
4. Hooks compartilhados (tipo `useToast`) cada Tab importa direto — não passa via prop.

**NÃO faça:**
- ❌ Não mude lógica de negócio de nenhuma Tab — só mova arquivos.
- ❌ Não introduza Zustand/Redux/Context novos — o estado local de cada Tab fica local.
- ❌ Não renomeie componentes (mantém `TabWhatsApp` como `TabWhatsApp`).
- ❌ Não remova comportamentos — se tiver código duplicado entre Tabs, deixa duplicado por ora.
- ❌ Não mexa em outros arquivos além de `AgentConfig.jsx` e os novos arquivos.

**Critério de aceite:**
- `AgentConfig.jsx` fica abaixo de 250 linhas.
- Cada Tab em arquivo separado com < 400 linhas.
- Todas as abas funcionam igual a antes (testar manualmente cada uma: general, knowledge, whatsapp conectado e desconectado, notes, webhooks).
- Sem regressões visuais.

---

## Task 9 — Sanitizar error handler 🟡

**Contexto:** O error handler global provavelmente retorna `err.message` direto pro cliente. Isso pode vazar stack traces, paths, queries Prisma, etc.

**Arquivo:** `backend/src/server.js` (onde estiver o error handler `(err, req, res, next)`)

**O que fazer:**
1. Logar o erro completo no servidor (`console.error(err)`).
2. Na resposta:
   - Se `err.status` estiver setado (erro esperado/controlado) → retornar `{ error: err.message }` com status.
   - Senão → retornar `{ error: 'Erro interno' }` com 500.
3. Em dev (`NODE_ENV !== 'production'`), pode incluir `err.stack` na resposta pra facilitar debug.

**NÃO faça:**
- ❌ Não adicione telemetria externa (Sentry, etc.).
- ❌ Não mude como erros são lançados no resto do código — só trata o handler.
- ❌ Não engula erros silenciosamente — log completo sempre.

**Critério de aceite:**
- Erro inesperado em produção retorna `{ error: 'Erro interno' }`, 500.
- Log no servidor tem stack completo.
- Erros com `err.status` (ex: 404, 403) continuam com mensagem original.
- Em dev, stack aparece na resposta.

---

## Task 10 — Backup automático do SQLite 🟡

**Contexto:** DB é SQLite. Sem backup, perda de dados = catástrofe.

**Arquivos:** novo `deployer/backup.sh` (ou `scripts/backup.sh`), ajuste em `docker-compose.prod.yml`

**O que fazer:**
1. Script shell que:
   - Roda `sqlite3 /data/db.sqlite ".backup /backups/db-$(date +%Y%m%d-%H%M%S).sqlite"`
   - Mantém só os últimos 14 backups (remove mais antigos).
2. Agendar via cron no host (ou sidecar container). Diário é suficiente.
3. Documentar no `README-DEPLOY.md` onde ficam os backups e como restaurar.

**NÃO faça:**
- ❌ Não suba backups pra nuvem nessa task (S3, etc.) — fica local por ora.
- ❌ Não mude o DB path.
- ❌ Não pare o serviço pra fazer backup — `.backup` do sqlite3 é online.

**Critério de aceite:**
- Script roda manualmente e gera arquivo.
- Cron agendado.
- Restore testado em ambiente de dev (documentar o comando).

---

## Task 11 — `.env.example` 🟢

**Contexto:** Não tem template de env. Novo dev/deploy tem que descobrir as vars.

**Arquivos:** novo `backend/.env.example`, novo `frontend/.env.example`

**O que fazer:**
1. Varrer `process.env.*` em `backend/src/**` e `import.meta.env.*` em `frontend/src/**`.
2. Listar todas no respectivo `.env.example` com:
   - Valor placeholder (nunca valor real)
   - Comentário explicando o que é
3. Adicionar `.env.example` ao repo (não `.env`).

**NÃO faça:**
- ❌ Não commite `.env` real.
- ❌ Não invente vars que o código não usa.

**Critério de aceite:**
- `cp backend/.env.example backend/.env` + preencher é suficiente pra rodar local.
- Toda var referenciada no código está no example.

---

## Task 12 — Code-split por rota no frontend 🟢

**Contexto:** Bundle único carrega tudo de uma vez. Dá pra reduzir TTI usando `React.lazy`.

**Arquivo:** `frontend/src/App.jsx` (ou onde rotas são declaradas)

**O que fazer:**
1. Trocar imports diretos de páginas por `React.lazy`:
   ```js
   const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
   ```
2. Envolver `<Routes>` com `<Suspense fallback={<Loading />}>`.
3. Criar um `<Loading />` simples (spinner ou skeleton) em `components/ui/Loading.jsx`.
4. Login NÃO precisa ser lazy (é a primeira tela sempre).

**NÃO faça:**
- ❌ Não faça lazy em componentes pequenos (só páginas de rota).
- ❌ Não remova nenhuma rota.
- ❌ Não adicione prefetch manual — deixa o Vite otimizar.

**Critério de aceite:**
- `npm run build` gera múltiplos chunks (`assets/Dashboard-*.js`, etc.).
- Navegação entre rotas funciona, com flash rápido de loading na primeira visita.
- Bundle principal fica menor que antes.
