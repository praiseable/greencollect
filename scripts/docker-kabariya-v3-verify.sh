#!/usr/bin/env bash
set -euo pipefail

BACKEND_CONTAINER="${BACKEND_CONTAINER:-gc-app-backend-1}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000}"
RUN_INTEGRATION=0
RUN_SMOKE=1

for arg in "$@"; do
  case "$arg" in
    --integration) RUN_INTEGRATION=1 ;;
    --smoke-only) RUN_INTEGRATION=0; RUN_SMOKE=1 ;;
    --integration-only) RUN_INTEGRATION=1; RUN_SMOKE=0 ;;
    -h|--help)
      cat <<HELP
Kabariya v3 Docker verification runner

Usage:
  ./scripts/docker-kabariya-v3-verify.sh [--smoke-only] [--integration] [--integration-only]

Environment overrides:
  BACKEND_CONTAINER=gc-app-backend-1
  BACKEND_URL=http://127.0.0.1:4000

Notes:
  - Smoke test creates a minimal buyer, seller, listing, top-up, and deposit in the runtime DB.
  - Integration tests create fuller end-to-end test data. Prefer staging/cloned DB for --integration.
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if ! docker inspect "$BACKEND_CONTAINER" >/dev/null 2>&1; then
  echo "FAILED: backend container '$BACKEND_CONTAINER' not found" >&2
  exit 1
fi

NETWORK="$(docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$BACKEND_CONTAINER" | head -n 1)"
if [ -z "$NETWORK" ]; then
  echo "FAILED: could not detect Docker network for $BACKEND_CONTAINER" >&2
  exit 1
fi

read_container_env() {
  docker exec "$BACKEND_CONTAINER" sh -lc "printenv $1 || true"
}

DATABASE_URL="$(read_container_env DATABASE_URL)"
REDIS_URL="$(read_container_env REDIS_URL)"
JWT_SECRET="$(read_container_env JWT_SECRET)"
JWT_REFRESH_SECRET="$(read_container_env JWT_REFRESH_SECRET)"

if [ -z "$DATABASE_URL" ]; then
  echo "FAILED: DATABASE_URL missing from $BACKEND_CONTAINER" >&2
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="kabariya_test_access_secret_$(printf 'x%.0s' {1..80})"
fi
if [ -z "$JWT_REFRESH_SECRET" ]; then
  JWT_REFRESH_SECRET="kabariya_test_refresh_secret_$(printf 'y%.0s' {1..80})"
fi

if command -v curl >/dev/null 2>&1; then
  echo "Checking backend health at $BACKEND_URL/health"
  curl -fsS "$BACKEND_URL/health" >/dev/null && echo "PASSED backend health endpoint"
else
  echo "curl not installed on host; skipping HTTP health probe"
fi

if [ ! -d backend ]; then
  echo "FAILED: run this script from the repository root containing ./backend" >&2
  exit 1
fi

TEST_CMD='apk add --no-cache openssl >/dev/null && npm ci && npx prisma generate'
if [ "$RUN_SMOKE" = "1" ]; then
  TEST_CMD="$TEST_CMD && npm run smoke-test"
fi
if [ "$RUN_INTEGRATION" = "1" ]; then
  TEST_CMD="$TEST_CMD && npm run test:integration"
fi

echo "Running Kabariya v3 checks in temporary Node 20 container on Docker network: $NETWORK"
docker run --rm \
  --network "$NETWORK" \
  -v "$(pwd)/backend:/app/backend" \
  -v "$(pwd)/packages:/app/packages:ro" \
  -v kabariya-v3-test-node-modules:/app/backend/node_modules \
  -w /app/backend \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  -e ALLOW_TEST_TOPUP=true \
  -e ALLOW_TEST_HANDSHAKE_OTP=true \
  -e NODE_ENV=test \
  node:20-alpine sh -lc "$TEST_CMD"
