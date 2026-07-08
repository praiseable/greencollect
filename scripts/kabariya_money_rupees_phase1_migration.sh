#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SQL_FILE="${SQL_FILE:-scripts/kabariya_money_rupees_phase1_migration.sql}"

cd "$(dirname "$0")/.."

echo "Kabariya money base-unit migration: paisa -> PKR rupees"
echo "COMPOSE_FILE=$COMPOSE_FILE SQL_FILE=$SQL_FILE"

test -f "$SQL_FILE" || { echo "Missing SQL file: $SQL_FILE" >&2; exit 1; }

docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$SQL_FILE"

echo "Migration status:"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT key, value FROM \"PlatformConfig\" WHERE key IN ('money_base_unit','deposit_min_flat_paisa') ORDER BY key;"