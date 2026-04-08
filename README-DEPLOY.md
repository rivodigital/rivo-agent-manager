# Deploy — Rivo Agent Manager (Hetzner)

Stack: Caddy (HTTPS) → Frontend (nginx) + Backend (Node) → Evolution API + Postgres + Redis. Tudo em Docker Compose num único servidor Hetzner.

---

## 1. Pré-requisitos

- Servidor Hetzner CX22 (ou superior) rodando **Ubuntu 24.04**
- Domínio com DNS apontando pro servidor: `agente.rivos.me  →  A  →  IP_DO_HETZNER`
- Acesso SSH ao servidor (via chave)

---

## 2. Preparar o servidor (uma vez)

```bash
ssh root@IP_DO_HETZNER

# Atualiza o sistema
apt update && apt upgrade -y

# Instala Docker
curl -fsSL https://get.docker.com | sh

# Firewall: libera SSH (22) + HTTP (80) + HTTPS (443)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Cria um usuário não-root pro deploy (opcional mas recomendado)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

A partir daqui pode logar como `ssh deploy@IP_DO_HETZNER`.

---

## 3. Configurar o DNS

No painel do seu provedor de DNS (rivos.me), crie:

```
Tipo: A
Nome: agente
Valor: IP_DO_HETZNER
TTL: 3600 (ou Auto)
```

Aguarde a propagação (geralmente 1-5 min). Confira:

```bash
dig +short agente.rivos.me
# deve retornar o IP do Hetzner
```

---

## 4. Clonar o repo no servidor

```bash
cd /home/deploy
git clone https://github.com/rivodigital/rivo-agent-manager.git
cd rivo-agent-manager
```

> Se o repo for **privado**, gere um deploy key ou use HTTPS com PAT.

---

## 5. Criar o `.env`

```bash
cp .env.example .env
nano .env
```

**Preencha os valores:**

```dotenv
DOMAIN=agente.rivos.me
ACME_EMAIL=seu-email@rivos.me

# Gere com: openssl rand -hex 32
JWT_SECRET=...
EVOLUTION_API_KEY=...
POSTGRES_EVOLUTION_PASSWORD=...

# Mantenha como está:
WEBHOOK_GLOBAL_URL=http://backend:3001/api/webhook/evolution
FALLBACK_MESSAGE="Desculpe, estou com dificuldades técnicas no momento. Tente novamente em instantes."
MESSAGE_BUFFER_SECONDS=3
CONVERSATION_HISTORY_LIMIT=20
```

> O acesso ao painel é via login (email + senha). O `JWT_SECRET` é o que assina os tokens de sessão — gere um valor forte e nunca compartilhe.

---

## 6. Subir a stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Acompanhe os logs:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy backend
```

O Caddy automaticamente vai pegar um certificado HTTPS do Let's Encrypt na primeira request. Acesse:

```
https://agente.rivos.me
```

---

## 6.1 Criar o primeiro usuário admin

Antes de conseguir logar no painel, crie um usuário direto pelo container do backend:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run user:create
```

Vai perguntar email, nome e senha (mínimo 8 caracteres). Depois é só acessar `https://agente.rivos.me` e logar.

Pra criar mais usuários depois, basta rodar o mesmo comando.

---

## 7. Configurar Provider de LLM (primeiro acesso)

Como o seed apaga tudo (é destrutivo), na primeira vez você cria o Provider direto pelo painel:

1. Acesse `https://agente.rivos.me`
2. Vá em Providers
3. Adicione `Google (Gemini)` com sua API key
4. Crie cliente, agente, conecte WhatsApp (escaneia QR de novo — sessão antiga fica no Mac)

**Alternativa**: copie o `dev.db` do seu Mac pro servidor (mantém todos os dados):

```bash
# No Mac:
scp "rivo-agent-manager/backend/prisma/dev.db" deploy@IP_DO_HETZNER:/tmp/dev.db

# No servidor:
docker compose -f docker-compose.prod.yml stop backend
docker run --rm -v rivo-agent-manager_backend_data:/data -v /tmp:/src alpine \
  sh -c "cp /src/dev.db /data/dev.db && chown 1000:1000 /data/dev.db"
docker compose -f docker-compose.prod.yml start backend
```

---

## 8. Updates futuros (auto-deploy via GitHub webhook)

Já vem configurado um container `deployer` que escuta webhooks do GitHub. Toda vez que você dá `git push origin main`, ele roda `git pull && docker compose up -d --build` sozinho.

**Setup (uma vez):**

1. Gere um segredo forte e bote no `.env` do servidor:
   ```bash
   echo "WEBHOOK_SECRET=$(openssl rand -hex 32)" >> .env
   docker compose -f docker-compose.prod.yml up -d --build deployer
   ```

2. No GitHub: repo → **Settings → Webhooks → Add webhook**
   - **Payload URL**: `https://agente.rivos.me/hooks/deploy`
   - **Content type**: `application/json`
   - **Secret**: cole o mesmo valor do `WEBHOOK_SECRET`
   - **Which events**: `Just the push event`
   - **Active**: ✓

3. Pronto. Teste com qualquer push em `main`. Pra ver os logs do deploy:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f deployer
   ```

**Deploy manual (sem push)**, se precisar:
```bash
ssh deploy@IP_DO_HETZNER
cd ~/rivo-agent-manager
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 9. Backup do banco

O SQLite vive no volume `backend_data`. Backup diário:

```bash
# /etc/cron.daily/rivo-backup
#!/bin/bash
BACKUP_DIR=/home/deploy/backups
mkdir -p $BACKUP_DIR
TS=$(date +%Y%m%d-%H%M%S)
docker run --rm \
  -v rivo-agent-manager_backend_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine sh -c "cp /data/dev.db /backup/rivo-$TS.db"
# mantém últimos 14
ls -t $BACKUP_DIR/rivo-*.db | tail -n +15 | xargs -r rm
```

```bash
chmod +x /etc/cron.daily/rivo-backup
```

---

## 10. Comandos úteis

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs de um serviço
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar 1 serviço
docker compose -f docker-compose.prod.yml restart backend

# Shell no backend
docker compose -f docker-compose.prod.yml exec backend sh

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Ver uso de disco
docker system df
```

---

## Troubleshooting

**Caddy não pega certificado HTTPS**
- DNS ainda não propagou: `dig agente.rivos.me`
- Porta 80/443 bloqueada: `ufw status`
- Logs: `docker logs rivo-caddy`

**Backend falha em conectar no banco**
- Volume não montado: `docker volume ls | grep backend_data`
- Logs: `docker logs rivo-backend`

**Evolution API não gera QR**
- Já tratado no compose: usamos `evoapicloud/evolution-api:v2.3.7` + `CONFIG_SESSION_PHONE_VERSION` recente.
