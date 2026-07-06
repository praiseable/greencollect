#!/usr/bin/env sh
set -eu

PROJECT_NAME="${PROJECT_NAME:-gc-app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000}"

echo "== Kabariya v3 Docker health =="
curl -fsS "$BACKEND_URL/health" || {
  echo "\nFAILED: health endpoint did not return 2xx"
  exit 1
}
echo "\nPASSED: /health responded"

echo "== Kabariya v3 runtime smoke =="
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec \
  -e ALLOW_TEST_TOPUP=true \
  -e ALLOW_TEST_HANDSHAKE_OTP=true \
  backend npm run smoke-test

echo "PASSED: Docker health + smoke completed"
