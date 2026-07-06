# Kabariya v3 Docker Runtime Testing

The production backend image is intentionally lean and installs runtime dependencies only. Because the integration suite requires Jest and Supertest, run verification from a temporary Node 20 test container attached to the same Docker network as the live backend container.

## 1. Confirm running services

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
curl -fsS http://127.0.0.1:4000/health && echo
```

Expected core services:

- `gc-app-backend-1` on port `4000`
- `gc-app-web-client-1` on ports `80/443`
- `gc-app-web-admin-1` on port `8080`
- `gc-app-db-1` using PostGIS/PostgreSQL
- `gc-app-redis-1` using Redis

## 2. Run smoke test against the runtime DB

From the repository root:

```bash
chmod +x scripts/docker-kabariya-v3-verify.sh
./scripts/docker-kabariya-v3-verify.sh --smoke-only
```

This executes the mandatory smoke lifecycle against the configured runtime database: onboard a test buyer/seller, create a seller listing, top up the buyer wallet, and place a buyer-funded deposit.

## 3. Run integration tests

Run this on staging or a cloned database because the integration tests create end-to-end test users, listings, deposits, transactions, and flags.

```bash
./scripts/docker-kabariya-v3-verify.sh --integration
```

## 4. Useful production diagnostics

```bash
docker logs --tail 200 gc-app-backend-1
docker exec gc-app-backend-1 sh -lc 'printenv DATABASE_URL REDIS_URL NODE_ENV PORT'
docker exec gc-app-backend-1 sh -lc 'node -v'
```

## 5. Notes

- `backend/Dockerfile` uses Node 20 to match the locked backend runtime.
- Do not run `npm run test:integration` directly inside the production backend image unless dev dependencies are installed there.
- The smoke script intentionally targets the runtime database, matching the v3 requirement.
