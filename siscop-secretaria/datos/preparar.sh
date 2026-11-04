#!/usr/bin/env bash
# Deja el SISCOP local del video en su estado inicial (datos de ejemplo frescos).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
su postgres -c "psql -q -d siscop_video -f $DIR/reiniciar.sql" 2>/dev/null
BACKEND="${BACKEND:?ruta al backend}" API="${API:-http://127.0.0.1:5050/api}" node "$DIR/sembrar.mjs" > /dev/null
su postgres -c "psql -q -d siscop_video -f $DIR/fechas.sql"
echo "datos listos"
