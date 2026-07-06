# Kabariya v3 Docker Deployment and Test Guide

This guide assumes the currently running Docker Compose project uses these production-style services:

- `gc-app-backend-1`
- `gc-app-db-1`
- `gc-app-redis-1`
- `gc-app-web-client-1`
- `gc-app-web-admin-1`

The goal is to deploy the Kabariya v3 backend patch safely, validate the database schema, run integration tests against a disposable test stack, then run the required smoke test against the runtime database.

## 1. Health check current stack

```bash
curl -fsS http://127.0.0.1:4000/health | jq .
docker logs --tail=100 gc-app-backend-1
```

Expected health response includes:

```json
{
  "status": "ok",
  "db": "connected"
}
```

## 2. Back up the runtime PostgreSQL database

```bash
mkdir -p backups
BACKUP="backups/kabariya_$(date +%Y%m%d_%H%M%S).dump"
docker exec -t gc-app-db-1 sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"
ls -lh "$BACKUP"
```

Do not continue if this backup file is empty.

## 3. Apply the patch to the checked-out repository

Use this from your repository root. Preserve your existing `.env` and production compose secrets.

```bash
mkdir -p ../gc_pre_v3_backup_$(date +%Y%m%d_%H%M%S)
cp -a backend packages docker-compose.prod.yml ../gc_pre_v3_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# Example if the patch was extracted to /tmp/greencollect-kabariya-v3-docker-ready/greencollect-main
rsync -a --delete /tmp/greencollect-kabariya-v3-docker-ready/greencollect-main/backend/ ./backend/
rsync -a /tmp/greencollect-kabariya-v3-docker-ready/greencollect-main/packages/ ./packages/
```

Do not blindly overwrite `docker-compose.prod.yml` if it contains live passwords, domains, or SSL settings. Manually merge only non-secret changes if needed.

## 4. Build the backend image

```bash
docker compose -p gc-app -f docker-compose.prod.yml build backend
```

The backend Dockerfile now uses `node:20-alpine`, matching the locked backend stack.

## 5. Generate and review schema migration SQL before applying

```bash
docker compose -p gc-app -f docker-compose.prod.yml run --rm --no-deps backend sh -lc '
  npx prisma generate &&
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma \
    --script
' > kabariya_v3_schema_diff.sql

sed -n '1,240p' kabariya_v3_schema_diff.sql
```

Review the SQL. For the v3 patch it should be mostly additive: wallet/deposit/ledger additions, transaction variance/handshake columns, optional tax fields, admin flagged users, and settings additions.

## 6. Apply the schema change

Recommended production path after reviewing the SQL:

```bash
docker compose -p gc-app -f docker-compose.prod.yml stop backend
cat kabariya_v3_schema_diff.sql | docker exec -i gc-app-db-1 sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
docker compose -p gc-app -f docker-compose.prod.yml up -d backend
```

For a staging-only environment, this is also acceptable:

```bash
docker compose -p gc-app -f docker-compose.prod.yml run --rm backend sh -lc 'npx prisma db push'
docker compose -p gc-app -f docker-compose.prod.yml up -d backend
```

Avoid `prisma db push --accept-data-loss` on production unless you have reviewed the generated SQL and accepted the risk.

## 7. Run integration tests against a disposable Docker test stack

Use a separate Compose project so tests do not mutate production data.

```bash
docker compose -p gc-kabariya-test -f docker-compose.yml up -d db redis

docker compose -p gc-kabariya-test -f docker-compose.yml run --rm \
  -e DATABASE_URL='postgresql://admin:secret@db:5432/kabariya?schema=public' \
  -e REDIS_URL='redis://redis:6379' \
  -e JWT_SECRET='test_access_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -e JWT_REFRESH_SECRET='test_refresh_secret_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy' \
  -e PORT=4000 \
  -e ALLOW_TEST_TOPUP=true \
  -e ALLOW_TEST_HANDSHAKE_OTP=true \
  backend sh -lc 'npm install && npx prisma generate && npx prisma db push && npm run test:integration'

docker compose -p gc-kabariya-test -f docker-compose.yml down -v
```

## 8. Run the required runtime smoke test

The smoke test creates a test buyer, test seller, free seller listing, wallet top-up, and buyer-funded deposit in the runtime DB.

```bash
docker compose -p gc-app -f docker-compose.prod.yml exec \
  -e ALLOW_TEST_TOPUP=true \
  -e ALLOW_TEST_HANDSHAKE_OTP=true \
  backend npm run smoke-test
```

Expected final line:

```text
Smoke test summary: PASSED 3/3 steps
```

## 9. Verify post-deploy health and logs

```bash
curl -fsS http://127.0.0.1:4000/health | jq .
docker logs --tail=200 gc-app-backend-1
```

## 10. Rollback

If backend startup fails after deploy:

```bash
docker compose -p gc-app -f docker-compose.prod.yml stop backend
# restore previous source from your backup directory, then rebuild
rsync -a --delete ../gc_pre_v3_backup_YYYYMMDD_HHMMSS/backend/ ./backend/
docker compose -p gc-app -f docker-compose.prod.yml build backend
docker compose -p gc-app -f docker-compose.prod.yml up -d backend
```

If schema rollback is required, restore from the dump created in step 2 into a maintenance window.

## Production safety notes

- Keep `ALLOW_TEST_OTP=false` and `ALLOW_TEST_TOPUP=false` in real production after validation.
- Do not expose database port 5432 publicly.
- Do not overwrite existing SSL/certbot volumes or live compose secrets from sample files.
- The smoke test intentionally leaves traceable smoke records in the database for auditability.
