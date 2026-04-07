# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

# OpenSSL é necessário pro Prisma em Alpine
RUN apk add --no-cache openssl

# Copia manifests e instala dependências
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copia o restante do código
COPY prisma ./prisma
COPY src ./src

# Gera o Prisma Client
RUN npx prisma generate

# Garante que o diretório do SQLite existe e é gravável
RUN mkdir -p /app/prisma && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Roda migrations + seed (idempotente) e sobe o servidor
# - migrate deploy é seguro de rodar a cada start (não recria)
# - seed só insere se não houver dados (depende do seu seed.js ser idempotente)
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
