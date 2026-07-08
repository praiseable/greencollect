#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SQL_FILE="${SQL_FILE:-scripts/kabariya_money_rupees_phase1_migration.sql}"

cd "${APP_DIR:-$HOME/gc-app}"

echo "Kabariya rupees-base DB migration v2"
echo "COMPOSE_FILE=$COMPOSE_FILE SQL_FILE=$SQL_FILE"
echo "----------------------------------------------------------------"

echo "Creating DB backup..."
mkdir -p backups
docker exec -t gc-app-db-1 sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/pre_money_rupees_v2_$(date +%Y%m%d_%H%M%S).dump"
ls -lh backups/pre_money_rupees_v2_*.dump | tail -1

echo "Stopping backend to avoid mixed money-base writes..."
docker compose -f "$COMPOSE_FILE" stop backend

echo "Applying schema-adaptive rupees migration..."
cat "$SQL_FILE" | docker exec -i gc-app-db-1 sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

echo "Migration applied. Backend remains stopped until rupees-aware code is deployed."
