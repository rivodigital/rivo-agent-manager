#!/bin/sh
# ============================================================================
# Auto-deploy script — chamado pelo webhook do GitHub via container "deployer".
# Roda dentro do container do webhook (alpine + docker cli + git) com:
#   - /var/run/docker.sock montado (pra falar com o daemon do host)
#   - /repo apontando pro diretório do projeto no host
# ============================================================================
set -e

cd /repo

echo "[deploy] === iniciando $(date -u +%FT%TZ) ==="

echo "[deploy] git pull"
git pull --ff-only origin main

echo "[deploy] docker compose build + up"
docker compose -f docker-compose.prod.yml up -d --build backend frontend

echo "[deploy] limpando imagens antigas"
docker image prune -f >/dev/null 2>&1 || true

echo "[deploy] === ok $(date -u +%FT%TZ) ==="
