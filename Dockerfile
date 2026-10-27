# Образ для Fly.io: база SQLite и фото лежат на томе /data (см. fly.toml)
FROM node:24-slim AS build
WORKDIR /app

# better-sqlite3 собирается из исходников
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

# prisma.config.ts требует DATABASE_URL; при сборке база не нужна
ENV DATABASE_URL=file:/tmp/build.db NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build


FROM node:24-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
COPY --from=build /app /app

EXPOSE 8080
CMD ["sh", "scripts/start.sh"]
