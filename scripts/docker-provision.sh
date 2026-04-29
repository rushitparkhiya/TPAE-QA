#!/usr/bin/env bash
# Orbit — Docker WP-CLI Provisioning
# Runs inside the wordpress:cli container after WordPress is up.
# Installs WordPress core, Elementor, TPAE, and creates all test pages
# required by the security-audit-phase1.spec.js Playwright suite.

set -e
WP="wp --path=/var/www/html --allow-root"
URL="${WP_HOME:-http://localhost:8881}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${CYAN}[provision]${NC} $*"; }
ok()  { echo -e "${GREEN}[provision] ✓${NC} $*"; }
skip(){ echo -e "${YELLOW}[provision] ~${NC} $* (already done)"; }

# ── Wait for MySQL to accept connections ─────────────────────────────────────
log "Waiting for database…"
until $WP db check 2>/dev/null; do sleep 3; done
ok "Database ready."

# ── Install WordPress core (idempotent) ──────────────────────────────────────
if ! $WP core is-installed 2>/dev/null; then
  log "Installing WordPress core…"
  $WP core install \
    --url="$URL" \
    --title="TPAE Security Audit QA" \
    --admin_user=admin \
    --admin_password=password \
    --admin_email=qa@orbit.test \
    --skip-email
  ok "WordPress installed."
else
  skip "WordPress core already installed."
fi

# ── Update site URL (in case container IP differs) ───────────────────────────
$WP option update siteurl "$URL" --quiet
$WP option update home    "$URL" --quiet

# ── Install and activate Elementor ───────────────────────────────────────────
if ! $WP plugin is-installed elementor 2>/dev/null; then
  log "Installing Elementor…"
  $WP plugin install elementor --activate
  ok "Elementor installed."
else
  $WP plugin activate elementor --quiet 2>/dev/null || true
  skip "Elementor already installed."
fi

# ── Install and activate TPAE from mounted zip ───────────────────────────────
if ! $WP plugin is-installed the-plus-addons-for-elementor-page-builder 2>/dev/null; then
  log "Installing TPAE from /tmp/tpae.zip…"
  $WP plugin install /tmp/tpae.zip --activate
  ok "TPAE installed."
else
  $WP plugin activate the-plus-addons-for-elementor-page-builder --quiet 2>/dev/null || true
  skip "TPAE already installed."
fi

# ── Install Query Monitor (optional — for debug) ─────────────────────────────
$WP plugin install query-monitor --activate --quiet 2>/dev/null || true

# ── Create test users ────────────────────────────────────────────────────────
for role in editor author contributor subscriber; do
  if ! $WP user get "qa-${role}" --field=ID 2>/dev/null; then
    $WP user create "qa-${role}" "${role}@orbit.test" \
      --role="$role" --user_pass="password" --quiet
    ok "User qa-${role} created."
  fi
done

# ── Seed 20 published posts for Load More widget ─────────────────────────────
POST_COUNT=$($WP post list --post_type=post --post_status=publish --format=count 2>/dev/null || echo 0)
if [ "$POST_COUNT" -lt 20 ]; then
  log "Seeding 20 blog posts…"
  for i in $(seq 1 20); do
    $WP post create \
      --post_type=post \
      --post_title="Security Audit Test Post $i" \
      --post_status=publish \
      --post_content="Post content for QA testing. Post number $i." \
      --quiet
  done
  ok "20 posts created."
else
  skip "Blog posts already seeded ($POST_COUNT found)."
fi

# ── Helper: create page if slug doesn't exist ────────────────────────────────
create_page() {
  local title="$1" slug="$2"
  if ! $WP post list --post_type=page --post_name="$slug" --format=count 2>/dev/null | grep -q "^[1-9]"; then
    $WP post create \
      --post_type=page \
      --post_title="$title" \
      --post_name="$slug" \
      --post_status=publish \
      --post_content="Test page for Orbit security audit." \
      --quiet
    ok "Page /$slug/ created."
  else
    skip "Page /$slug/ already exists."
  fi
}

# ── Create the 7 Elementor widget test pages ─────────────────────────────────
create_page "Accordion Test"        "accordion-test"
create_page "Page Scroll Test"      "page-scroll-test"
create_page "Style List Test"       "style-list-test"
create_page "Video Player Test"     "video-player-test"
create_page "Testimonial Test"      "testimonial-test"
create_page "Blog Load More Test"   "blog-load-more-test"
create_page "Twitter Embed Test"    "twitter-embed-test"

# ── Enable permalinks (required for slug-based page URLs) ────────────────────
$WP rewrite structure '/%postname%/' --hard --quiet
$WP rewrite flush --hard --quiet
ok "Permalinks set to /%postname%/"

# ── Flush cache ──────────────────────────────────────────────────────────────
$WP cache flush --quiet 2>/dev/null || true

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Provisioning complete. WordPress is ready for Playwright.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Admin:    $URL/wp-admin   (admin / password)"
echo "  TPAE:     $(cd /var/www/html && $WP plugin get the-plus-addons-for-elementor-page-builder --field=version 2>/dev/null || echo 'installed')"
echo ""
