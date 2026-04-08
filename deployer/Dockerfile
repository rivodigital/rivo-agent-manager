# Container que escuta webhook do GitHub e dispara o deploy.sh
# Inclui: webhook (adnanh/webhook), git, docker-cli, docker-compose-plugin
FROM alpine:3.20

RUN apk add --no-cache \
    webhook \
    git \
    docker-cli \
    docker-cli-compose \
    openssh-client \
    bash

EXPOSE 9000

# -template habilita {{ getenv "..." }} dentro do hooks.json
CMD ["webhook", "-hooks", "/etc/webhook/hooks.json", "-verbose", "-template", "-port", "9000"]
