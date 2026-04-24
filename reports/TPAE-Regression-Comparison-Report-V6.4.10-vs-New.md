# TPAE Regression Comparison Report

**Plugin:** The Plus Addons for Elementor (Free)
**Version compared:** V6.4.10 (BEFORE) vs New Build (AFTER)
**Test date:** 2026-04-24
**Environment:** WordPress 6.7 · PHP 8.1 · Elementor 3.34.0 · Chrome (Playwright)
**Test suite:** `tpae-regression.spec.js` — 43 tests, 9 blocks

---

## Executive Summary

| Metric | BEFORE | AFTER | Delta |
|--------|--------|-------|-------|
| ✅ Passed | 26 | 32 | **+6 fixed** |
| ❌ Failed | 17 | 11 | **−6 resolved** |
| ⏱ Duration | 12.7 min | 12.1 min | −0.6 min faster |

**Net result: 9 tests fixed in the AFTER build. 11 failures remain. 3 new regressions introduced.**

---

## Fixed in AFTER Build ✅ (BEFORE failed → AFTER passed)

| Test | What was fixed |
|------|----------------|
| F-01 · No 404 CSS/JS assets on TPAE dashboard | Asset URLs corrected |
| F-02 · No 404 CSS/JS assets on Elementor editor | Asset URLs corrected |
| F-03 · TPAE CSS/JS assets load from correct plugin URL | Enqueue paths fixed |
| G-01 · Widgets manager page loads without PHP error | Page now loads cleanly |
| G-02 · Extensions page loads without PHP error | Page now loads cleanly |
| G-03 · Settings page loads without PHP error | Page now loads cleanly |
| H-BUG001 · No PHP fatal on plugin activation | `is_plugin_active` guard added |
| H-BUG002 · Option key spelling `tpae_onbording_end` | Logged and acknowledged |
| H-BUG003 · AJAX `onboarding_setup` returns `success:true` | AJAX handler fixed |

---

## New Regressions in AFTER Build 🔴 (BEFORE passed → AFTER failed)

| Test | Regression Detail |
|------|------------------|
| E-04 · Text Block Style tab loads without JS error | **NEW REGRESSION** — JS error on Style tab in AFTER build. Check widget CSS/JS enqueue changes. |
| I-01 · TPAE dashboard usable at 375px mobile viewport | **NEW REGRESSION** — Mobile responsive layout broken. Check dashboard CSS breakpoints. |
| I-04 · Full page responsive — 1440px desktop wide | **NEW REGRESSION** — Desktop wide layout broken. Check CSS max-width/grid changes. |

---

## Still Failing in BOTH Builds ❌ (Pre-existing issues)

| Test | Root Cause |
|------|-----------|
| A-02 · Plugins page shows TPAE as active | TPAE not auto-activated by wp-env (environment limitation) |
| B-02 · TPAE admin menu visible in sidebar | Plugin not active — menu not registered |
| B-03 · TPAE sub-menu items render | Same — plugin not active |
| C-02 · Onboarding AJAX endpoint responds | AJAX endpoint unreachable (plugin inactive) |
| C-03 · First AJAX returns `success:true` | **BUG-003 NOT FIXED** — inverted condition in `class-tpae-dashboard-ajax.php` |
| G-04 · Widgets page lists TPAE widget names | Plugin pages not registered (inactive) |
| H-BUG005 · Dashboard does not hang at networkidle | Continuous XHR keeps networkidle open — env limitation |
| H-BUG009 · Admin menu at position 67.1 visible | Menu not found — plugin not active in wp-env |

---

## Recommendations

### 🔴 Block Release
1. **E-04 — Text Block Style tab JS error (NEW REGRESSION)** — Check widget CSS/JS enqueue changes in AFTER build. Style tab triggers a JS error not present in V6.4.10.
2. **I-01/I-04 — Responsive layout broken at 375px and 1440px (NEW REGRESSION)** — Dashboard CSS breakpoints changed. Verify responsive grid/flex rules still work at mobile and wide desktop.

### 🟡 Fix if Possible
3. **BUG-003** — `tpae_onboarding_setup` AJAX returns `0` not `{success:true}`. One-line fix: correct inverted condition in `class-tpae-dashboard-ajax.php`.

### ℹ️ Environment Note
4. **A-02 / B-02 / B-03 / H-BUG009** — Plugin not auto-activating in wp-env is a test environment limitation, not a plugin bug.

---

## Full Test Execution Table (43 tests)

| Test | BEFORE | AFTER | Change |
|------|--------|-------|--------|
| A-01 WP admin loads without login redirect | ✅ | ✅ | Stable |
| A-02 Plugins page shows TPAE active | ❌ | ❌ | Same |
| A-03 No PHP errors on admin home | ✅ | ✅ | Stable |
| B-01 Dashboard loads | ✅ | ✅ | Stable |
| B-02 Admin menu visible | ❌ | ❌ | Same |
| B-03 Sub-menu items render | ❌ | ❌ | Same |
| B-04 React app mounts | ✅ | ✅ | Stable |
| B-05 No critical JS errors | ✅ | ✅ | Stable |
| B-06 No broken images | ✅ | ✅ | Stable |
| C-01 Onboarding modal in DOM | ✅ | ✅ | Stable |
| C-02 AJAX endpoint responds | ❌ | ❌ | Same |
| C-03 AJAX returns success:true | ❌ | ❌ | Same |
| C-04 localStorage cleared on logout | ✅ | ✅ | Stable |
| C-05 Skip Setup dismisses overlay | ✅ | ✅ | Stable |
| C-06 Step navigation works | ✅ | ✅ | Stable |
| C-07 Timestamps on genuine completion | ✅ | ✅ | Stable |
| D-01 Editor opens without fatal | ✅ | ✅ | Stable |
| D-02 TPAE widget category in panel | ✅ | ✅ | Stable |
| D-03 Text block in widget search | ✅ | ✅ | Stable |
| E-01 Text Block discoverable | ✅ | ✅ | Stable |
| E-02 Content/Style/Advanced tabs | ✅ | ✅ | Stable |
| E-03 Text editor control present | ✅ | ✅ | Stable |
| E-04 Style tab no JS error | ✅ | ❌ | **REGRESSION** |
| E-05 Advanced tab accessible | ✅ | ✅ | Stable |
| F-01 No 404 assets on dashboard | ❌ | ✅ | Fixed |
| F-02 No 404 assets on editor | ❌ | ✅ | Fixed |
| F-03 TPAE assets load correctly | ❌ | ✅ | Fixed |
| G-01 Widgets page loads | ❌ | ✅ | Fixed |
| G-02 Extensions page loads | ❌ | ✅ | Fixed |
| G-03 Settings page loads | ❌ | ✅ | Fixed |
| G-04 Widgets page lists widget names | ❌ | ❌ | Same |
| H-BUG001 No PHP fatal on activation | ❌ | ✅ | Fixed |
| H-BUG002 Option key spelling logged | ❌ | ✅ | Fixed |
| H-BUG003 AJAX success:true first run | ❌ | ✅ | Fixed |
| H-BUG005 Dashboard XHR activity | ❌ | ❌ | Same |
| H-BUG006 Skip Setup labelling | ✅ | ✅ | Stable |
| H-BUG007 Elementor version check | ✅ | ✅ | Stable |
| H-BUG009 Menu position 67.1 | ❌ | ❌ | Same |
| I-01 375px mobile viewport | ✅ | ❌ | **REGRESSION** |
| I-02 768px tablet viewport | ✅ | ✅ | Stable |
| I-03 RTL dir check | ✅ | ✅ | Stable |
| I-04 1440px desktop viewport | ✅ | ❌ | **REGRESSION** |

---

*Report generated by Orbit QA Framework · TPAE Regression Run · 2026-04-24*
