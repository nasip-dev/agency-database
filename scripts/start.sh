#!/bin/sh
# Запуск на сервере: обновить структуру базы, создать руководителя и районы
# (только при первом запуске), затем стартовать сайт.
set -e

mkdir -p "${UPLOAD_DIR:-uploads}"
node_modules/.bin/prisma migrate deploy
node_modules/.bin/tsx prisma/seed.ts
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
