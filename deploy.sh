#!/bin/sh
# ============================================================================
# Auto-deploy script — chamado pelo webhook do GitHub via container "deployer".
# Roda dentro do container do webhook (alpine + docker cli + git) com:
#   - /var/run/docker.sock montado (pra falar com o daemon do host)
#   - /repo apontando pro diretório do projeto no host
# ============================================================================
set -e

cd /root/rivo-agent-manager

# Força o mesmo project name usado quando se sobe manualmente do host
# (senão o compose usa "repo" e cria uma stack paralela em conflito)
export COMPOSE_PROJECT_NAME=rivo-agent-manager

echo "[deploy] === iniciando $(date -u +%FT%TZ) ==="

echo "[deploy] git pull"
git pull --ff-only origin main

echo "[deploy] removendo containers antigos de backend/frontend (labels divergentes)"
docker rm -f rivo-backend rivo-frontend 2>/dev/null || true

echo "[deploy] docker compose build + up"
docker compose -p rivo-agent-manager -f docker-compose.prod.yml up -d --build backend frontend

echo "[deploy] removendo stack órfã 'repo' criada por execução anterior"
docker network rm repo_rivo-network 2>/dev/null || true

echo "[deploy] limpando imagens antigas"
docker image prune -f >/dev/null 2>&1 || true

echo "[deploy] === ok $(date -u +%FT%TZ) ==="
