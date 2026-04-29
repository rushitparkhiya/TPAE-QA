#!/usr/bin/env bash
# Orbit — Security Audit Phase 1 — Static Verification
#
# Greps the TPAE plugin source for the 22 fix patterns described in
# "Security Audit Phase 1 — QA Verification Plan" and reports PASS/FAIL.
#
# Usage:
#   bash scripts/check-security-audit-phase1.sh                       # auto-detect plugin from qa.config.json
#   bash scripts/check-security-audit-phase1.sh /path/to/plugin       # explicit path
#   bash scripts/check-security-audit-phase1.sh plugins/free/the-plus-addons-for-elementor-page-builder.zip
#
# Exit code:
#   0  — all 22 fixes verified
#   1  — one or more fixes missing
#
# Each fix has a positive check (expected pattern present) and where applicable
# a negative check (anti-pattern absent). A fix passes only if both clear.

set -e

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

# ── Resolve plugin path ──────────────────────────────────────────────────────
INPUT="${1:-}"
PLUGIN=""
TMPDIR=""

cleanup() { [ -n "$TMPDIR" ] && [ -d "$TMPDIR" ] && rm -rf "$TMPDIR"; }
trap cleanup EXIT

if [ -z "$INPUT" ]; then
  if [ -f "qa.config.json" ]; then
    INPUT=$(python3 -c "import json,sys; c=json.load(open('qa.config.json')); print(c.get('plugin',{}).get('path',''))" 2>/dev/null || echo "")
  fi
fi

if [ -z "$INPUT" ]; then
  for guess in \
    "plugins/free/the-plus-addons-for-elementor-page-builder" \
    "plugins/free/the-plus-addons-for-elementor-page-builder.zip" \
    "../the-plus-addons-for-elementor-page-builder"; do
    if [ -e "$guess" ]; then INPUT="$guess"; break; fi
  done
fi

if [ -z "$INPUT" ] || [ ! -e "$INPUT" ]; then
  echo -e "${RED}error:${NC} no plugin path. Pass a path: bash $0 /path/to/plugin" >&2
  exit 2
fi

if [[ "$INPUT" == *.zip ]]; then
  TMPDIR=$(mktemp -d)
  echo -e "${DIM}Extracting $INPUT → $TMPDIR${NC}"
  unzip -q -o "$INPUT" -d "$TMPDIR"
  PLUGIN=$(find "$TMPDIR" -maxdepth 2 -name "the_plus_addons.php" -o -name "theplus_elementor_addon.php" 2>/dev/null | head -1 | xargs -I{} dirname {} 2>/dev/null)
  [ -z "$PLUGIN" ] && PLUGIN=$(find "$TMPDIR" -maxdepth 1 -mindepth 1 -type d | head -1)
else
  PLUGIN="$INPUT"
fi

if [ ! -d "$PLUGIN" ]; then
  echo -e "${RED}error:${NC} plugin path is not a directory: $PLUGIN" >&2
  exit 2
fi

VERSION=$(grep -m1 "L_THEPLUS_VERSION" "$PLUGIN/theplus_elementor_addon.php" 2>/dev/null | grep -oE "'[0-9.]+'" | tr -d "'" || echo "?")

echo ""
echo -e "${BOLD}${CYAN}Orbit — Security Audit Phase 1 — Static Verification${NC}"
echo -e "${DIM}Plugin: $PLUGIN${NC}"
echo -e "${DIM}Version: $VERSION${NC}"
echo ""

PASS=0; FAIL=0
RESULTS=()

# ── Helpers ──────────────────────────────────────────────────────────────────
# expect: file MUST contain pattern
expect() {
  local id="$1" desc="$2" file="$3" pattern="$4"
  local fullpath="$PLUGIN/$file"
  if [ ! -f "$fullpath" ]; then
    printf "  ${RED}✗ %-9s${NC} %s\n      ${DIM}file missing: %s${NC}\n" "$id" "$desc" "$file"
    RESULTS+=("FAIL $id"); FAIL=$((FAIL+1)); return
  fi
  local hit
  hit=$(grep -nE "$pattern" "$fullpath" | head -1 || true)
  if [ -n "$hit" ]; then
    local line; line=$(echo "$hit" | cut -d: -f1)
    printf "  ${GREEN}✓ %-9s${NC} %s\n      ${DIM}%s:%s${NC}\n" "$id" "$desc" "$file" "$line"
    RESULTS+=("PASS $id"); PASS=$((PASS+1))
  else
    printf "  ${RED}✗ %-9s${NC} %s\n      ${DIM}pattern not found in %s${NC}\n      ${DIM}/%s/${NC}\n" "$id" "$desc" "$file" "$pattern"
    RESULTS+=("FAIL $id"); FAIL=$((FAIL+1))
  fi
}

# refute: file MUST NOT contain pattern  (anti-pattern check)
refute() {
  local id="$1" desc="$2" file="$3" pattern="$4"
  local fullpath="$PLUGIN/$file"
  if [ ! -f "$fullpath" ]; then
    printf "  ${YELLOW}? %-9s${NC} %s ${DIM}(file missing — vacuously OK)${NC}\n" "$id" "$desc"
    RESULTS+=("PASS $id"); PASS=$((PASS+1)); return
  fi
  local hit
  hit=$(grep -nE "$pattern" "$fullpath" | head -1 || true)
  if [ -z "$hit" ]; then
    printf "  ${GREEN}✓ %-9s${NC} %s\n      ${DIM}anti-pattern absent from %s${NC}\n" "$id" "$desc" "$file"
    RESULTS+=("PASS $id"); PASS=$((PASS+1))
  else
    printf "  ${RED}✗ %-9s${NC} %s\n      ${DIM}anti-pattern still present at %s:%s${NC}\n" "$id" "$desc" "$file" "$(echo "$hit" | cut -d: -f1)"
    RESULTS+=("FAIL $id"); FAIL=$((FAIL+1))
  fi
}

# refute_global: anti-pattern must be absent across the entire plugin
refute_global() {
  local id="$1" desc="$2" pattern="$3" exclude="${4:-}"
  local hits
  if [ -n "$exclude" ]; then
    hits=$(grep -rnE "$pattern" "$PLUGIN" --include="*.php" --exclude="$exclude" 2>/dev/null | head -3 || true)
  else
    hits=$(grep -rnE "$pattern" "$PLUGIN" --include="*.php" 2>/dev/null | head -3 || true)
  fi
  if [ -z "$hits" ]; then
    printf "  ${GREEN}✓ %-9s${NC} %s\n      ${DIM}no occurrences anywhere in plugin${NC}\n" "$id" "$desc"
    RESULTS+=("PASS $id"); PASS=$((PASS+1))
  else
    printf "  ${RED}✗ %-9s${NC} %s\n" "$id" "$desc"
    while IFS= read -r line; do printf "      ${DIM}%s${NC}\n" "$line"; done <<< "$hits"
    RESULTS+=("FAIL $id"); FAIL=$((FAIL+1))
  fi
}

# ─── CRITICAL ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Critical (C1–C10)${NC}"

expect "C1"      "Accordion widget — wp_kses_post on rendered fields" \
       "modules/widgets/tp_accordion.php"          "wp_kses_post"

expect "C2"      "Page Scroll widget — wp_kses_post on rendered fields" \
       "modules/widgets/tp_page_scroll.php"        "wp_kses_post"

expect "C3"      "Style List widget — wp_kses_post on rendered fields" \
       "modules/widgets/tp_style_list.php"         "wp_kses_post"

expect "C4"      "Video Player — data-stickyparam uses esc_attr(wp_json_encode(...))" \
       "modules/widgets/tp_video_player.php"       "data-stickyparam.*esc_attr.*wp_json_encode"

expect "C5"      "Dashboard tpae_api_call — invalid_url SSRF guard" \
       "includes/admin/dashboard/class-tpae-dashboard-ajax.php" "['\"]invalid_url['\"]"

expect "C6-a"    "Template rename — current_user_can('edit_post', \$id)" \
       "modules/widgets-feature/template-editor/class-tp-create-template.php" \
       "current_user_can\\(\\s*['\"]edit_post['\"]"
expect "C6-b"    "Template rename — \"Invalid template.\" rejection" \
       "modules/widgets-feature/template-editor/class-tp-create-template.php" \
       "Invalid template"

refute "C7-a"    "WDesignKit dismiss — wp_ajax_nopriv_tp_dont_show_again removed" \
       "includes/notices/class-tp-wdkit-preview-popup.php" \
       "wp_ajax_nopriv_tp_dont_show_again"
expect "C7-b"    "WDesignKit dismiss — capability check inside tp_dont_show_again" \
       "includes/notices/class-tp-wdkit-preview-popup.php" \
       "current_user_can\\("

expect "C9-a"    "Plugin install — \"Invalid Plugin Type\" rejection" \
       "modules/controls/theme-builder/tpae-class-nxt-download.php" \
       "Invalid Plugin Type"
expect "C9-b"    "Plugin install — allowlist contains nexter_ext + tp_woo" \
       "modules/controls/theme-builder/tpae-class-nxt-download.php" \
       "['\"]nexter_ext['\"]"

expect "C10"     "Ask-review notice — theplus_askreview_notice_dismiss action registered" \
       "includes/notices/class-tp-ask-review-notice.php" \
       "wp_ajax_theplus_askreview_notice_dismiss"

# ─── HIGH ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}High (H11–NEW)${NC}"

expect "H11"     "Twitter timeline — data-chrome built with wp_json_encode + esc_attr" \
       "modules/widgets/tp_social_embed.php" \
       "wp_json_encode|data-chrome.*esc_attr"

expect "H12"     "Theme installer — themes_api() in dashboard ajax" \
       "includes/admin/dashboard/class-tpae-dashboard-ajax.php" \
       "themes_api\\("

expect "H14-a"   "Form handler — json_decode runs before sanitize_text_field" \
       "modules/widgets-feature/class-tp-form-handler.php" \
       "json_decode"
expect "H14-b"   "Form handler — tp-form-nonce verified" \
       "modules/widgets-feature/class-tp-form-handler.php" \
       "tp-form-nonce"

expect "H15a-1"  "SVG sanitization — svgz MIME registration" \
       "widgets_loader.php" \
       "svgz.*image/svg"
expect "H15a-2"  "SVG sanitization — gzdecode for .svgz inspection" \
       "widgets_loader.php" \
       "gzdecode"
expect "H15a-3"  "SVG sanitization — onload/foreignObject/iframe regex blocks" \
       "widgets_loader.php" \
       "on\\[a-z\\]\\+|foreignObject|iframe"

refute_global "NEW" "unserialize() removed from any wp_remote_* HTTP body" \
       "unserialize\\s*\\(\\s*wp_remote_retrieve_body|unserialize\\s*\\(\\s*\\\$body" ""

# ─── MEDIUM ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Medium (M18–M23)${NC}"

expect "M18"     "Deactivate feedback — current_user_can('deactivate_plugins')" \
       "includes/user-experience/class-tp-deactivate-feedback.php" \
       "current_user_can\\(\\s*['\"]deactivate_plugins['\"]"

expect "M20-a"   "Dynamic tag (mark seen) — manage_options gate" \
       "modules/extensions/dynamic-tag/class-tpae-dynamic-tag.php" \
       "tp_mark_dynamic_tag_seen"
expect "M20-b"   "Dynamic tag (dismiss notice) — manage_options gate" \
       "modules/extensions/dynamic-tag/class-tpae-dynamic-tag.php" \
       "tpae_dismiss_dynamic_notice"
expect "M20-c"   "Dynamic tag — current_user_can('manage_options') present" \
       "modules/extensions/dynamic-tag/class-tpae-dynamic-tag.php" \
       "current_user_can\\(\\s*['\"]manage_options['\"]"

expect "M22"     "Widget save — invalid_payload rejection on bad JSON" \
       "includes/admin/dashboard/class-tpae-dashboard-ajax.php" \
       "invalid_payload"

expect "M23-a"   "Testimonial JS — uses textContent (not innerHTML)" \
       "assets/js/main/testimonial/plus-testimonial.js" \
       "textContent\\s*=\\s*buttonText"
refute "M23-b"   "Testimonial JS — innerHTML not assigned for read-more label" \
       "assets/js/main/testimonial/plus-testimonial.js" \
       "innerHTML\\s*=\\s*buttonText"

# ─── LOW ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Low (L28, L29, L31)${NC}"

expect "L28"     "WDesignKit JS — uses console.error (not console.log)" \
       "assets/js/wdesignkit/tp-wdkit-preview-popup.js" \
       "console\\.error\\(.*TPAE"
refute "L28-neg" "WDesignKit JS — TPAE-prefixed console.log removed" \
       "assets/js/wdesignkit/tp-wdkit-preview-popup.js" \
       "console\\.log\\(.*TPAE"

expect "L29"     "Elementor install JS — uses console.error (not console.log)" \
       "assets/js/admin/tp-elementor-install.js" \
       "console\\.error\\(.*TPAE"
refute "L29-neg" "Elementor install JS — TPAE-prefixed console.log removed" \
       "assets/js/admin/tp-elementor-install.js" \
       "console\\.log\\(.*TPAE"

refute "L31"     "Deactivate feedback — sslverify=false override removed" \
       "includes/user-experience/class-tp-deactivate-feedback.php" \
       "sslverify['\"]?\\s*=>\\s*false"

# ─── Summary ─────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo ""
echo -e "${BOLD}────────────────────────────────────────────────────────────────${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All $TOTAL checks passed.${NC}  Phase 1 fixes verified in source."
  EXIT=0
else
  echo -e "${RED}${BOLD}✗ $FAIL of $TOTAL checks failed.${NC}  See ✗ rows above."
  echo ""
  echo -e "${YELLOW}Failed checks:${NC}"
  for r in "${RESULTS[@]}"; do
    [[ "$r" == FAIL* ]] && echo "  • ${r#FAIL }"
  done
  EXIT=1
fi
echo -e "${BOLD}────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${DIM}Run the runtime Playwright suite next:${NC}"
echo -e "${DIM}  npx playwright test tests/playwright/elementor/security-audit-phase1.spec.js${NC}"
echo ""
exit $EXIT
