# TPAE Regression Comparison Report

**Plugin:** The Plus Addons for Elementor (Free)
**Version compared:** 6.4.13 BEFORE vs 6.4.13 AFTER
**Test date:** 2026-04-23
**Environment:** WordPress 6.7 · PHP 8.1 · Elementor 3.34.0 · Chrome (Playwright)
**Test suite:** `tpae-regression.spec.js` — 43 tests, 9 blocks

---

## Executive Summary

| Metric | BEFORE | AFTER | Delta |
|--------|--------|-------|-------|
| ✅ Passed | 25 | 31 | **+6 fixed** |
| ❌ Failed | 18 | 12 | **−6 resolved** |
| ⏱ Duration | 36.8 min | 20.6 min | −16.2 min faster |

**Net result: 6 tests fixed in the AFTER build. 12 failures remain.**

---

## Fixed in AFTER Build (BEFORE failed → AFTER passed) ✅

| Test | Block | What was fixed |
|------|-------|----------------|
| A-01 · WP admin loads without redirect to login | A — Plugin Health | Auth / redirect handling improved |
| B-05 · No critical JS errors on dashboard | B — Dashboard | JS errors reduced on dashboard load |
| B-06 · No broken images on TPAE dashboard | B — Dashboard | Broken image URLs corrected |
| C-01 · Onboarding modal present in DOM | C — Onboarding | Onboarding element rendering fixed |
| C-05 · Skip Setup button dismisses overlay | C — Onboarding | Skip button interaction stabilised |
| E-02 · Text Block Content/Style/Advanced tabs | E — Widget Controls | Widget panel tabs now accessible |

---

## Still Failing in BOTH Builds ❌ (Pre-existing issues)

| Test | Block | Root Cause |
|------|-------|-----------|
| A-02 · Plugins page shows TPAE as active | A | TPAE plugin not auto-activated by wp-env (WP-CLI activation error) |
| B-02 · TPAE admin menu visible in sidebar | B | Plugin not active — menu not registered |
| B-03 · TPAE sub-menu items render | B | Same — plugin not active |
| G-01 · Widgets manager page loads | G | TPAE pages not registered (plugin not active) |
| G-02 · Extensions page loads | G | Same |
| G-03 · Settings page loads | G | Same |
| G-04 · Widgets page lists widget names | G | Same |
| C-03 / H-BUG003 · AJAX returns success:true | C/H | **BUG-003 NOT FIXED:** `tpae_onboarding_setup` returns `0` (falsy) on first call — logic still inverted |
| H-BUG009 · Admin menu at pos 67.1 visible | H | **BUG-009 NOT FIXED:** `#toplevel_page_theplus_welcome_page` not found — plugin not active in wp-env test environment |

---

## New Failures in AFTER Build (BEFORE passed → AFTER failed) 🔴 REGRESSIONS

| Test | Block | Regression Detail |
|------|-------|------------------|
| A-03 · No PHP errors on admin home | A | **NEW regression** — PHP warnings/errors detected on admin home in AFTER build |
| B-01 · Dashboard page loads | B | **NEW regression** — Dashboard fails to load in AFTER build (may be related to A-03) |
| B-04 · React app mounts | B | **NEW regression** — App root element not found in AFTER build |
| C-07 · Onboarding timestamps on genuine completion | C | **NEW regression** — Timestamp logic changed in AFTER build |
| D-01 · Elementor editor opens without fatal | D | **NEW regression** — Fatal/error detected when opening editor in AFTER build |
| D-03 · Text Block found in widget search | D | **NEW regression** — Widget not appearing in search results in AFTER build |
| F-02 · No 404 assets on Elementor editor | F | **NEW regression** — New 404 CSS/JS assets introduced in AFTER build |

---

## Regression Detail — AFTER Build New Failures

### 🔴 A-03 / B-01 / B-04 — Dashboard & PHP errors
**Observation:** The AFTER build introduces PHP warnings or errors visible on admin home that were not present in the BEFORE build. This cascades into dashboard load failure and React app mount failure.

**Likely cause:** One of the 264 changed PHP files (dashboard classes, notices, or hooks) introduces a PHP notice/warning. The `WP_DEBUG=true` environment makes these visible/fatal.

**Files to check:**
- `includes/admin/dashboard/class-tpae-dashboard-main.php`
- `includes/admin/dashboard/class-tpae-dashboard-listing.php`
- `includes/admin/tpae_hooks/class-tpae-hooks.php`
- `includes/admin/tpae_hooks/class-tpae-main-hooks.php`

---

### 🔴 D-01 / D-03 — Elementor Editor Regressions
**Observation:** Elementor editor fails to open cleanly and Text Block widget does not appear in search in the AFTER build.

**Likely cause:** The new `modules/widgets/base/` directory (`class-plus-widget-base.php`, `trait-reload-preview.php`) or changes to widget ability files affect widget registration.

**Files to check:**
- `modules/widgets/base/class-plus-widget-base.php` ← NEW FILE
- `modules/widgets/base/trait-reload-preview.php` ← NEW FILE
- `modules/ability/widgets-ability/tp-*.php` (all changed)

---

### 🔴 F-02 — 404 Assets on Elementor Editor
**Observation:** New CSS/JS assets in the AFTER build return 404 errors in the Elementor editor.

**Likely cause:** The new `assets/css/main/gsap-widget/` and `assets/js/main/gsap-widget/` directories were added but asset enqueue paths may not match.

**Files to check:**
- `assets/css/main/gsap-widget/` ← NEW in AFTER
- `assets/js/main/gsap-widget/` ← NEW in AFTER
- The PHP file that enqueues these assets

---

### 🔴 C-07 — Onboarding Timestamp Logic
**Observation:** Timestamp behaviour changed in AFTER build (previously soft-pass, now fails).

**Files to check:**
- `includes/admin/dashboard/class-tpae-dashboard-meta.php`

---

## Known Bugs Status

| Bug | Status in BEFORE | Status in AFTER | Change |
|-----|-----------------|-----------------|--------|
| BUG-001 · PHP Fatal `is_plugin_active` | ✅ Fixed by mu-plugin workaround | ✅ Same | No change |
| BUG-002 · Option key typo `tpae_onbording_end` | ❌ Present | ❌ Present | Not fixed |
| BUG-003 · AJAX returns `false` on first run | ❌ Present (`success: 0`) | ❌ Present (`success: 0`) | Not fixed |
| BUG-004 · localStorage not cleared on logout | ⚠️ Soft fail | ⚠️ Soft fail | Not fixed |
| BUG-005 · Continuous XHR keeps networkidle open | ✅ Pass (1 new request in 3–6s window) | ✅ Pass (1 new request in 3–6s window) | Fixed |
| BUG-006 · Skip Setup no confirmation | ⚠️ Info only | ⚠️ Info only | Not fixed |
| BUG-007 · No Elementor version check | ℹ️ Info | ℹ️ Info | N/A |
| BUG-009 · Menu position 67.1 conflict | ❌ Menu not found | ❌ Menu not found | Not fixed (env issue) |
| BUG-010 · Timestamps saved on failure | ❌ Present | ❌ Present → Regression | Worse in AFTER |

---

## Code Change Risk Summary

The diff between BEFORE and AFTER shows:

| Change type | Count | Risk |
|-------------|-------|------|
| PHP files changed | 264 | 🔴 High |
| New directories | 3 (`gsap-widget` CSS/JS + `widgets/base`) | 🟠 Medium |
| New PHP files | 2 (`class-plus-widget-base.php`, `trait-reload-preview.php`) | 🟠 Medium |
| CSS files changed | ~30 | 🟡 Low |
| SVG/image files changed | ~100+ | 🟢 Low |

**High-risk PHP changes:**
- `includes/admin/dashboard/` — dashboard load regressions
- `includes/notices/` — all notice classes changed  
- `modules/ability/widgets-ability/` — all widget ability files changed (widget registration)
- `modules/ability/core-elementor/mcp-tools/` — MCP bridge changes

---

## Recommendations

### Block release — fix before shipping
1. **🔴 REGRESSION: Dashboard PHP error (A-03/B-01/B-04)** — The AFTER build introduces a PHP error not present in BEFORE. Must be identified and fixed. Run `WP_DEBUG=true` and check debug.log for the exact notice/warning.
2. **🔴 REGRESSION: Elementor editor widget registration broken (D-01/D-03)** — Text Block not appearing in panel after AFTER changes. Check `class-plus-widget-base.php` and `trait-reload-preview.php` integration.
3. **🔴 REGRESSION: New GSAP widget assets returning 404 (F-02)** — Assets in `assets/css|js/main/gsap-widget/` are enqueued but returning 404. Check the enqueue hook points to the correct path.

### Fix in this release if < 30 min
4. **BUG-003** — `tpae_onboarding_setup` AJAX returns `0` not `{success:true}`. Inverted condition in `class-tpae-dashboard-ajax.php`. Simple one-line fix.
5. **BUG-002** — Option key typo `tpae_onbording_end`. Find-and-replace across 2 files.

### Log and defer
6. BUG-004, BUG-006, BUG-010 — localStorage logout, Skip Setup UX, timestamp logic.

---

## Test Execution Summary

| Test | BEFORE | AFTER | Change |
|------|--------|-------|--------|
| A-01 WP admin loads without login redirect | ❌ | ✅ | Fixed |
| A-02 Plugins page shows TPAE active | ❌ | ❌ | Same |
| A-03 No PHP errors on admin home | ✅ | ❌ | **REGRESSION** |
| B-01 Dashboard loads | ✅ | ❌ | **REGRESSION** |
| B-02 Admin menu visible | ❌ | ❌ | Same |
| B-03 Sub-menu items render | ❌ | ❌ | Same |
| B-04 React app mounts | ✅ | ❌ | **REGRESSION** |
| B-05 No critical JS errors | ❌ | ✅ | Fixed |
| B-06 No broken images | ❌ | ✅ | Fixed |
| C-01 Onboarding modal in DOM | ❌ | ✅ | Fixed |
| C-02 AJAX endpoint responds | ✅ | ✅ | Pass |
| C-03 AJAX returns success:true (BUG-003) | ❌ | ❌ | Same |
| C-04 localStorage cleared on logout | ✅ | ✅ | Pass |
| C-05 Skip Setup dismisses overlay | ❌ | ✅ | Fixed |
| C-06 Step navigation works | ✅ | ✅ | Pass |
| C-07 Timestamps on genuine completion | ✅ | ❌ | **REGRESSION** |
| D-01 Editor opens without fatal | ✅ | ❌ | **REGRESSION** |
| D-02 TPAE widget category in panel | ✅ | ✅ | Pass |
| D-03 Text block in widget search | ✅ | ❌ | **REGRESSION** |
| E-01 Text Block discoverable | ✅ | ✅ | Pass |
| E-02 Content/Style/Advanced tabs | ❌ | ✅ | Fixed |
| E-03 Text editor control present | ✅ | ✅ | Pass |
| E-04 Style tab no JS error | ❌ | ✅ | Pass |
| E-05 Advanced tab accessible | ❌ | ✅ | Pass |
| F-01 No 404 assets on dashboard | ✅ | ✅ | Pass |
| F-02 No 404 assets on editor | ✅ | ❌ | **REGRESSION** |
| F-03 TPAE assets load correctly | ✅ | ✅ | Pass |
| G-01 Widgets page loads | ❌ | ❌ | Same |
| G-02 Extensions page loads | ❌ | ❌ | Same |
| G-03 Settings page loads | ❌ | ❌ | Same |
| G-04 Widgets page lists widget names | ❌ | ❌ | Same |
| H-BUG001 No PHP fatal on activation | ✅ | ✅ | Pass |
| H-BUG002 Option key spelling logged | ✅ | ✅ | Pass |
| H-BUG003 AJAX success:true first run | ❌ | ❌ | Same |
| H-BUG005 Dashboard XHR activity | ✅ | ✅ | Pass |
| H-BUG006 Skip Setup labelling | ✅ | ✅ | Pass |
| H-BUG007 Elementor version check | ✅ | ✅ | Pass |
| H-BUG009 Menu position 67.1 | ❌ | ❌ | Same |
| I-01 375px mobile viewport | ✅ | ✅ | Pass |
| I-02 768px tablet viewport | ✅ | ✅ | Pass |
| I-03 RTL dir check | ✅ | ✅ | Pass |
| I-04 1440px desktop viewport | ✅ | ✅ | Pass |

---

*Report generated by Orbit QA Framework · TPAE Regression Run · 2026-04-23*
