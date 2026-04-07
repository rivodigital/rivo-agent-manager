# syntax=docker/dockerfile:1.6

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Build arg pro token de autenticação (vira variável Vite no bundle)
ARG VITE_AUTH_TOKEN
ENV VITE_AUTH_TOKEN=$VITE_AUTH_TOKEN

RUN npm run build

# ---- Stage 2: nginx serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
