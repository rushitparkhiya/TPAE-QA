#!/usr/bin/env bash
# Orbit — Playwright Docker Entrypoint
# Waits for WordPress to respond, runs auth setup, then executes tests.

set -e

WP_URL="${WP_TEST_URL:-http://wordpress}"
MAX_WAIT=120  # seconds

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${CYAN}[playwright]${NC} $*"; }
ok()  { echo -e "${GREEN}[playwright] ✓${NC} $*"; }
err() { echo -e "${RED}[playwright] ✗${NC} $*"; }

# ── Wait for WordPress to respond ────────────────────────────────────────────
log "Waiting for WordPress at $WP_URL…"
START=$(date +%s)
until curl -sf "$WP_URL/wp-login.php" -o /dev/null 2>/dev/null; do
  NOW=$(date +%s)
  if [ $((NOW - START)) -gt $MAX_WAIT ]; then
    err "WordPress did not respond within ${MAX_WAIT}s."
    exit 1
  fi
  sleep 3
done
ok "WordPress is up."

# ── Create output directories ─────────────────────────────────────────────────
mkdir -p /app/reports/screenshots/security-audit
mkdir -p /app/.auth

# ── Run auth setup (saves admin cookies to .auth/wp-admin.json) ──────────────
log "Running auth setup…"
npx playwright test \
  --config=tests/playwright/playwright.config.js \
  --project=setup \
  tests/playwright/auth.setup.js \
  --reporter=line 2>&1 || {
  err "Auth setup failed — check WP_ADMIN_USER / WP_ADMIN_PASS and that WordPress is accessible."
  exit 1
}
ok "Auth cookies saved."

# ── Run the security audit spec ───────────────────────────────────────────────
log "Running Security Audit Phase 1 tests…"
npx playwright test \
  --config=tests/playwright/playwright.config.js \
  --project=chromium \
  tests/playwright/elementor/security-audit-phase1.spec.js \
  --reporter=html,line

EXIT=$?

# ── Print report location ─────────────────────────────────────────────────────
echo ""
if [ $EXIT -eq 0 ]; then
  ok "All tests passed."
else
  err "$EXIT test(s) failed."
fi
echo ""
echo "  HTML report: reports/playwright-html/index.html"
echo "  Screenshots: reports/screenshots/security-audit/"
echo ""
echo "  View report locally:"
echo "    npx playwright show-report reports/playwright-html"
echo ""

exit $EXIT
