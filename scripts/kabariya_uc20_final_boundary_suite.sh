#!/usr/bin/env bash
# Kabariya UC-20 final boundary suite runner.
# Runs the deployed smoke/boundary scripts in order. This is mutating and can take time.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RUN_FULL="${RUN_FULL:-0}"
SKIP_HEAVY="${SKIP_HEAVY:-0}"
PASS=0
FAIL=0
SKIP=0
WARN=0

line(){ printf '%s\n' '----------------------------------------------------------------'; }
pass(){ PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; }
skip(){ SKIP=$((SKIP+1)); printf '⏭️  SKIP  %s\n' "$1"; }
warn(){ WARN=$((WARN+1)); printf '⚠️  WARN  %s\n' "$1"; }

run_step(){
  local label="$1" cmd="$2"
  line
  printf '▶ %s\n' "$label"
  if bash -lc "$cmd"; then
    pass "$label"
  else
    fail "$label"
  fi
}

run_script_if_present(){
  local label="$1" script="$2"
  if [ ! -f "$script" ]; then
    skip "$label — missing $script"
    return 0
  fi
  sed -i 's/\r$//' "$script" 2>/dev/null || true
  chmod +x "$script" 2>/dev/null || true
  run_step "$label" "BASE_URL='$BASE_URL' COMPOSE_FILE='$COMPOSE_FILE' bash '$script'"
}

printf 'Kabariya UC-20 final boundary suite runner\n'
printf 'BASE_URL=%s COMPOSE_FILE=%s RUN_FULL=%s SKIP_HEAVY=%s\n' "$BASE_URL" "$COMPOSE_FILE" "$RUN_FULL" "$SKIP_HEAVY"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-20 summary: PASSED=%s FAILED=%s WARNINGS=%s SKIPPED=%s\n' "$PASS" "$FAIL" "$WARN" "$SKIP"
  exit 1
fi
pass "docker compose project reachable"

if [ "$RUN_FULL" != "1" ]; then
  warn "RUN_FULL is not 1, so only non-heavy checks will run. Set RUN_FULL=1 for full mutating boundary suite."
fi

run_step "backend built-in 3-step smoke-test" "docker compose -f '$COMPOSE_FILE' exec -T backend npm run smoke-test"

if [ -f scripts/greencollect_server_smoke_suite.sh ]; then
  sed -i 's/\r$//' scripts/greencollect_server_smoke_suite.sh 2>/dev/null || true
  chmod +x scripts/greencollect_server_smoke_suite.sh 2>/dev/null || true
  run_step "read-only platform smoke suite" "BASE_URL='$BASE_URL' WEB_URL='http://127.0.0.1' ADMIN_URL='http://127.0.0.1:8080' bash scripts/greencollect_server_smoke_suite.sh"
else
  skip "read-only platform smoke suite — missing script"
fi

run_script_if_present "UC-19 security acceptance smoke" "scripts/kabariya_uc19_security_acceptance_smoke.sh"

if [ "$RUN_FULL" = "1" ] && [ "$SKIP_HEAVY" != "1" ]; then
  run_script_if_present "UC-5..UC-9 happy path + handshake + seller-free boundary" "scripts/kabariya_uc5_uc9_dealflow_smoke.sh"
  run_script_if_present "UC-10 collections/logistics" "scripts/kabariya_uc10_collections_smoke.sh"
  run_script_if_present "UC-11 disputes/reversal boundary" "scripts/kabariya_uc11_disputes_smoke.sh"
  run_script_if_present "UC-12 buyer subscriptions/seller-gate absence" "scripts/kabariya_uc12_subscriptions_smoke.sh"
  run_script_if_present "UC-13 notifications event coverage" "scripts/kabariya_uc13_notifications_smoke.sh"
  run_script_if_present "UC-14 payment webhook/idempotency" "scripts/kabariya_uc14_payments_smoke.sh"
  run_script_if_present "UC-15 localization/integer money" "scripts/kabariya_uc15_i18n_money_smoke.sh"
  run_script_if_present "UC-16 seller-free/buyer-tiered analytics" "scripts/kabariya_uc16_analytics_smoke.sh"
  run_script_if_present "UC-17 anti-disintermediation no-auto-penalty" "scripts/kabariya_uc17_disintermediation_smoke.sh"
  run_script_if_present "UC-18 admin reconciliation/security" "scripts/kabariya_uc18_admin_reconciliation_smoke.sh"
else
  skip "heavy mutating UC-5..UC-18 scripts skipped; rerun with RUN_FULL=1 to execute all"
fi

line
printf 'UC-20 summary: PASSED=%s FAILED=%s WARNINGS=%s SKIPPED=%s\n' "$PASS" "$FAIL" "$WARN" "$SKIP"
[ "$FAIL" -eq 0 ]
