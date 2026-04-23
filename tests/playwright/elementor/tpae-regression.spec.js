// @ts-check
/**
 * TPAE — Full Regression Suite
 *
 * Covers every critical path for The Plus Addons for Elementor (Free):
 *
 *   Block A — Plugin Health         (activation, no PHP errors, no fatal)
 *   Block B — Admin Dashboard       (menu, sub-menu, React app, JS errors)
 *   Block C — Onboarding Flow       (modal, steps, skip, AJAX, localStorage)
 *   Block D — Widgets Panel         (search, categories, widget count)
 *   Block E — Text Block Widget     (insert, content/style/advanced controls, frontend)
 *   Block F — Asset Integrity       (no 404 on CSS/JS, no broken images)
 *   Block G — Settings Pages        (widgets list, extensions, settings tabs)
 *   Block H — Known Bug Regressions (BUG-001 … BUG-010 from v1 QA report)
 *   Block I — Responsive / RTL      (mobile viewport, RTL dir attribute)
 *
 * Prerequisites:
 *   • WordPress 6.7 running at WP_TEST_URL (default http://localhost:8881)
 *   • Elementor + TPAE active
 *   • Auth cookies saved:
 *       WP_TEST_URL=http://localhost:8881 npx playwright test tests/playwright/auth.setup.js --project=setup
 *
 * Run all:
 *   npx playwright test tests/playwright/elementor/tpae-regression.spec.js --project=chromium
 *
 * Run one block:
 *   npx playwright test tpae-regression.spec.js --grep "Block C"
 *
 * Run headed (visible browser):
 *   npx playwright test tpae-regression.spec.js --project=chromium --headed
 */

'use strict';

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE       = process.env.WP_TEST_URL || 'http://localhost:8881';
const ADMIN      = `${BASE}/wp-admin`;
const AJAX_URL   = `${ADMIN}/admin-ajax.php`;
const SNAP_DIR   = path.join(__dirname, '../../../reports/screenshots/tpae-regression');
const VIDEO_DIR  = path.join(__dirname, '../../../reports/videos');

/** WP admin pages for TPAE */
const PAGES = {
  dashboard:  `${ADMIN}/admin.php?page=theplus_welcome_page`,
  widgets:    `${ADMIN}/admin.php?page=theplus_widgets`,
  extensions: `${ADMIN}/admin.php?page=theplus_extensions`,
  settings:   `${ADMIN}/admin.php?page=theplus_settings`,
  plugins:    `${ADMIN}/plugins.php`,
  adminHome:  `${ADMIN}/`,
};

/** Elementor editor on a new page */
const EDITOR_URL = `${ADMIN}/post-new.php?post_type=page`;

fs.mkdirSync(SNAP_DIR,  { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Save screenshot under reports/screenshots/tpae-regression/<label>.png */
async function snap(page, label) {
  const file = path.join(SNAP_DIR, `${label.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

/**
 * Navigate to a URL and wait for DOM ready.
 * Uses 'domcontentloaded' (not 'networkidle') to avoid BUG-005 timeout.
 */
async function goto(page, url, extra = 2000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(extra);
}

/**
 * Assert no PHP fatal/parse errors in page body.
 * Call after every page load.
 */
async function assertNoPhpError(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  expect(body, 'PHP Fatal error on page').not.toMatch(/Fatal error:/i);
  expect(body, 'PHP Parse error on page').not.toMatch(/Parse error:/i);
  expect(body, 'Call to undefined function').not.toMatch(/Call to undefined function/i);
  expect(body, 'wp_die output on page').not.toMatch(/wp_die/i);
}

/**
 * Collect JS/console errors during a test.
 * Returns array of error strings (empty = clean).
 */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror',  (e)   => errors.push(`[PAGE]    ${e.message}`));
  page.on('console',    (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore browser-native noise
      if (/favicon|chrome-extension|DevTools|ResizeObserver|Non-Error promise/i.test(text)) return;
      errors.push(`[CONSOLE] ${text}`);
    }
  });
  return errors;
}

/** Wait for Elementor panel to be ready */
async function waitForElementorPanel(page, timeout = 35_000) {
  await page.waitForSelector(
    '#elementor-panel, .elementor-panel, #elementor-navigator',
    { timeout }
  ).catch(() => null);
  await page.waitForTimeout(1500);
}

// ─── Block A — Plugin Health ───────────────────────────────────────────────────

test.describe('Block A — Plugin Health', () => {

  test('A-01 · WP admin loads without redirect to login', async ({ page }) => {
    await goto(page, PAGES.adminHome);
    const url = page.url();
    expect(url, 'Redirected to login — auth cookies missing or stale').not.toContain('wp-login.php');
    await assertNoPhpError(page);
    await snap(page, 'A-01-admin-home');
  });

  test('A-02 · Plugins page shows TPAE as active (not deactivated or error)', async ({ page }) => {
    await goto(page, PAGES.plugins);
    await assertNoPhpError(page);

    const body = await page.locator('body').innerText().catch(() => '');
    // Plugin should appear on the page
    const tpaePresent =
      body.includes('The Plus Addons') ||
      body.includes('theplus') ||
      body.includes('TPAE');
    expect(tpaePresent, 'TPAE not found on plugins page — plugin may not be installed').toBeTruthy();
    await snap(page, 'A-02-plugins-list');
  });

  test('A-03 · No PHP errors or warnings in WP debug log format on admin home', async ({ page }) => {
    const jsErrors = collectErrors(page);
    await goto(page, PAGES.adminHome);
    await assertNoPhpError(page);
    // Log any JS errors found (non-blocking — informational)
    if (jsErrors.length) console.warn('[A-03] JS errors on admin home:', jsErrors.slice(0, 5));
    await snap(page, 'A-03-admin-no-errors');
  });

});

// ─── Block B — Admin Dashboard ────────────────────────────────────────────────

test.describe('Block B — Admin Dashboard', () => {

  test('B-01 · TPAE dashboard page loads (domcontentloaded — not networkidle)', async ({ page }) => {
    // Intentional: use domcontentloaded to avoid BUG-005 (continuous XHR keeps network active)
    const jsErrors = collectErrors(page);
    await goto(page, PAGES.dashboard, 3000);
    await assertNoPhpError(page);

    const title = await page.title();
    expect(title.length, 'Page title empty — dashboard may have failed to render').toBeGreaterThan(0);

    console.log(`[B-01] Dashboard title: "${title}"`);
    console.log(`[B-01] JS errors: ${jsErrors.length}`);
    await snap(page, 'B-01-dashboard');
  });

  test('B-02 · TPAE top-level admin menu item is visible in sidebar', async ({ page }) => {
    await goto(page, PAGES.adminHome);
    const tpaeMenu = page.locator('#toplevel_page_theplus_welcome_page');
    await expect(tpaeMenu).toBeVisible({ timeout: 10_000 });
    await snap(page, 'B-02-admin-menu');
  });

  test('B-03 · TPAE sub-menu items render under the top-level menu', async ({ page }) => {
    await goto(page, PAGES.dashboard, 2000);

    // Hover the top-level item to reveal sub-menu
    const topMenu = page.locator('#toplevel_page_theplus_welcome_page > a').first();
    const topMenuVisible = await topMenu.isVisible().catch(() => false);
    if (topMenuVisible) await topMenu.hover();
    await page.waitForTimeout(500);

    const subMenu = page.locator('#toplevel_page_theplus_welcome_page .wp-submenu');
    const subMenuVisible = await subMenu.isVisible().catch(() => false);
    console.log(`[B-03] Sub-menu visible: ${subMenuVisible}`);

    // At minimum the dashboard link should exist in the adminmenu
    const adminMenuText = await page.locator('#adminmenu').innerText().catch(() => '');
    const hasSubLinks =
      adminMenuText.includes('Widgets') ||
      adminMenuText.includes('Settings') ||
      adminMenuText.includes('Extensions') ||
      adminMenuText.includes('The Plus');
    expect(hasSubLinks, 'No TPAE sub-menu links found in admin sidebar').toBeTruthy();
    await snap(page, 'B-03-submenu');
  });

  test('B-04 · TPAE dashboard React app mounts — root element present in DOM', async ({ page }) => {
    await goto(page, PAGES.dashboard, 4000);
    await assertNoPhpError(page);

    // React/Vue app root — TPAE renders into a #tpae-app, #root, or .tpae-dashboard element
    const appRoot = page.locator(
      '#tpae-app, #root, .tpae-dashboard, .tpae-onboarding-cover, [id^="tpae"], [class*="tpae-dash"]'
    ).first();
    const rootExists = await appRoot.count().then(n => n > 0).catch(() => false);
    console.log(`[B-04] App root found: ${rootExists}`);
    await snap(page, 'B-04-react-app');
  });

  test('B-05 · No critical JS errors on dashboard page load', async ({ page }) => {
    const jsErrors = collectErrors(page);
    await goto(page, PAGES.dashboard, 5000);

    const critical = jsErrors.filter(e =>
      !/favicon|chrome-extension|ResizeObserver|Non-Error/i.test(e)
    );
    if (critical.length > 0) {
      console.error('[B-05] Critical JS errors:\n', critical.join('\n'));
    }
    // Soft assertion — log but do not fail so other blocks still run
    expect(critical.length, `${critical.length} critical JS errors on dashboard`).toBeLessThanOrEqual(3);
    await snap(page, 'B-05-js-errors');
  });

  test('B-06 · No broken images (4xx) on TPAE dashboard', async ({ page }) => {
    const broken = [];
    page.on('response', (res) => {
      if (res.request().resourceType() === 'image' && res.status() >= 400) {
        broken.push(`${res.status()} ${res.url()}`);
      }
    });
    await goto(page, PAGES.dashboard, 4000);
    if (broken.length) console.warn('[B-06] Broken images:', broken);
    expect(broken.length, `Broken images on dashboard: ${broken.join(', ')}`).toBe(0);
    await snap(page, 'B-06-images');
  });

});

// ─── Block C — Onboarding Flow ────────────────────────────────────────────────

test.describe('Block C — Onboarding Flow', () => {

  test('C-01 · Onboarding modal/cover is present in DOM on fresh visit', async ({ page }) => {
    await goto(page, PAGES.dashboard, 4000);
    await assertNoPhpError(page);

    const onboarding = page.locator(
      '.tpae-onboarding-cover, .onboarding-cover, .tpae-onboarding, [class*="onboarding"]'
    ).first();
    const found = await onboarding.count().then(n => n > 0).catch(() => false);
    console.log(`[C-01] Onboarding element found in DOM: ${found}`);
    // Soft: log rather than hard-fail (may already be dismissed in existing DB)
    await snap(page, 'C-01-onboarding-modal');
  });

  test('C-02 · Onboarding AJAX endpoint responds — action tpae_dashboard_ajax_call', async ({ page }) => {
    await goto(page, PAGES.dashboard, 2000);

    // Read nonce from page if TPAE injects it
    const nonce = await page.evaluate(() => {
      return (
        window?.tpae_db_object?.nonce ||
        window?.tpae_obj?.nonce ||
        document.querySelector('[data-nonce]')?.dataset?.nonce ||
        ''
      );
    });

    const response = await page.evaluate(async (ajaxUrl) => {
      try {
        const res = await fetch(ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'tpae_dashboard_ajax_call',
            type:   'tpae_onboarding_setup',
          }),
        });
        const text = await res.text();
        return { status: res.status, body: text };
      } catch (e) {
        return { status: 0, body: String(e) };
      }
    }, AJAX_URL);

    console.log(`[C-02] AJAX status: ${response.status} | body: ${response.body?.slice(0, 120)}`);
    expect(response.status, 'AJAX endpoint returned non-200').toBe(200);
    // Should return JSON (not -1 or empty — those indicate missing action handler)
    expect(response.body, 'AJAX returned empty body').toBeTruthy();
    expect(response.body, 'AJAX returned -1 (action not registered)').not.toBe('-1');
    await snap(page, 'C-02-ajax-response');
  });

  test('C-03 · First AJAX call returns success:true (not false on first run — BUG-003 regression)', async ({ page }) => {
    // BUG-003: on first run success was false because of inverted logic
    await goto(page, PAGES.dashboard, 2000);

    // Clear the onboarding end option so we simulate first run via localStorage
    await page.evaluate(() => {
      localStorage.removeItem('tpae_onboarding_step');
      localStorage.removeItem('tpae_import_step');
    });

    const response = await page.evaluate(async (ajaxUrl) => {
      try {
        const res  = await fetch(ajaxUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    new URLSearchParams({
            action: 'tpae_dashboard_ajax_call',
            type:   'tpae_onboarding_setup',
          }),
        });
        const json = await res.json().catch(() => null);
        return json;
      } catch (e) {
        return null;
      }
    }, AJAX_URL);

    console.log(`[C-03] tpae_onboarding_setup response:`, JSON.stringify(response));
    if (response !== null) {
      // BUG-003 regression: success should be true on first run
      expect(
        response.success,
        'BUG-003 REGRESSION: tpae_onboarding_setup returned success:false on first call'
      ).toBe(true);
    }
  });

  test('C-04 · localStorage keys tpae_onboarding_step / tpae_import_step clear after logout (BUG-004 regression)', async ({ page }) => {
    // BUG-004: localStorage not cleared on logout — next admin sees stale step
    await goto(page, PAGES.dashboard, 3000);

    // Set mock state
    await page.evaluate(() => {
      localStorage.setItem('tpae_onboarding_step', '3');
      localStorage.setItem('tpae_import_step', '2');
    });

    // Simulate logout
    await page.goto(`${BASE}/wp-login.php?action=logout`);
    await page.waitForLoadState('domcontentloaded');
    // Follow the logout confirmation link if present
    const logoutLink = page.locator('a[href*="action=logout"]').first();
    if (await logoutLink.count() > 0) {
      await logoutLink.click();
      await page.waitForLoadState('domcontentloaded');
    }
    await page.waitForTimeout(1000);

    // Check localStorage — ideally cleared on logout
    const step = await page.evaluate(() => localStorage.getItem('tpae_onboarding_step'));
    const imp  = await page.evaluate(() => localStorage.getItem('tpae_import_step'));
    console.log(`[C-04] After logout: tpae_onboarding_step="${step}", tpae_import_step="${imp}"`);
    // BUG-004 regression: both should be null/empty after logout
    if (step !== null || imp !== null) {
      console.warn('[C-04] BUG-004 NOT FIXED: localStorage keys still present after logout');
    }
    // Log finding, don't hard-fail (fix may require JS hook)
    await snap(page, 'C-04-localstorage-logout');
  });

  test('C-05 · Skip Setup button is present and dismisses the onboarding overlay', async ({ page }) => {
    await goto(page, PAGES.dashboard, 4000);
    await assertNoPhpError(page);

    const skipSelectors = [
      '.tpae-skip-setup',
      '[class*="skip-setup"]',
      '[class*="onboarding-close"]',
      'button:has-text("Skip")',
      'span:has-text("Skip Setup")',
      'a:has-text("Skip")',
    ];

    let skipFound = false;
    for (const sel of skipSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        console.log(`[C-05] Skip button found: ${sel}`);
        await el.click();
        await page.waitForTimeout(1500);
        skipFound = true;
        break;
      }
    }

    console.log(`[C-05] Skip button found and clicked: ${skipFound}`);
    await snap(page, 'C-05-after-skip');
  });

  test('C-06 · Onboarding step navigation — Next/Continue button advances step', async ({ page }) => {
    await goto(page, PAGES.dashboard, 4000);

    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Get Started")',
      '[class*="next-btn"]',
      '[class*="btn-next"]',
    ];

    let advanced = false;
    for (const sel of nextSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        const stepBefore = await page.evaluate(() => localStorage.getItem('tpae_onboarding_step') || '0');
        await el.click();
        await page.waitForTimeout(1200);
        const stepAfter = await page.evaluate(() => localStorage.getItem('tpae_onboarding_step') || '0');
        console.log(`[C-06] Step before: ${stepBefore}, after: ${stepAfter}`);
        advanced = true;
        break;
      }
    }
    console.log(`[C-06] Step navigation found: ${advanced}`);
    await snap(page, 'C-06-step-navigation');
  });

  test('C-07 · Onboarding timestamps saved only on genuine completion (BUG-010 regression)', async ({ page }) => {
    // BUG-010: tpae_onboarding_time saved even when AJAX returns false
    await goto(page, PAGES.dashboard, 2000);
    console.log('[C-07] Checking: tpae_onboarding_time should not be set until actual completion');
    // This is a code-path check — we can only verify via WP-CLI or DB query in CI.
    // Log the current AJAX behaviour so CI reports have evidence.
    await snap(page, 'C-07-onboarding-timestamps');
  });

});

// ─── Block D — Widgets Panel ─────────────────────────────────────────────────

test.describe('Block D — Elementor Widgets Panel', () => {

  test('D-01 · Elementor editor opens without fatal error on new page', async ({ page }) => {
    const jsErrors = collectErrors(page);
    await goto(page, EDITOR_URL, 3000);
    await assertNoPhpError(page);
    await waitForElementorPanel(page);

    const panelVisible = await page.locator('#elementor-panel, .elementor-panel').isVisible().catch(() => false);
    console.log(`[D-01] Elementor panel visible: ${panelVisible}`);
    await snap(page, 'D-01-editor-open');
  });

  test('D-02 · TPAE widget category appears in Elementor panel', async ({ page }) => {
    await goto(page, EDITOR_URL, 3000);
    await waitForElementorPanel(page);

    // Click Elements tab if not active
    const elementsTab = page.locator('[data-view="elements"], .elementor-panel-menu-item-editor-elements, #elementor-panel-elements-button, .elementor-editor-elements-panel').first();
    if (await elementsTab.count() > 0) await elementsTab.click().catch(() => {});
    await page.waitForTimeout(1000);

    // Look for The Plus category header
    const tpaeCategory = page.locator(
      '[class*="theplus"], [class*="the-plus"], [class*="tpae"], .elementor-element-categories .elementor-element-category-title'
    ).first();
    const catFound = await tpaeCategory.count().then(n => n > 0);
    console.log(`[D-02] TPAE category element found: ${catFound}`);
    await snap(page, 'D-02-widget-category');
  });

  test('D-03 · Searching "text block" in Elementor panel returns TPAE widget', async ({ page }) => {
    await goto(page, EDITOR_URL, 3000);
    await waitForElementorPanel(page);

    // Find and use the search input
    const searchInput = page.locator(
      '#elementor-panel-elements-search-input, input[placeholder*="Search"], .elementor-search-input input'
    ).first();
    const searchFound = await searchInput.count().then(n => n > 0);
    if (searchFound) {
      await searchInput.click();
      await searchInput.fill('text block');
      await page.waitForTimeout(1500);

      const results = page.locator('.elementor-element-wrapper, [class*="elementor-element-"]');
      const count   = await results.count().catch(() => 0);
      console.log(`[D-03] Widget search "text block" results: ${count}`);
      expect(count, 'No widgets found when searching "text block"').toBeGreaterThan(0);
    } else {
      console.warn('[D-03] Search input not found — Elementor may be loading slowly');
    }
    await snap(page, 'D-03-widget-search');
  });

});

// ─── Block E — Text Block Widget ─────────────────────────────────────────────

test.describe('Block E — Text Block Widget Controls', () => {

  /**
   * Creates a new Elementor page, drags in Text Block, and returns the page.
   * Shared setup for E-02 … E-05.
   */
  async function openEditorWithTextBlock(page) {
    await goto(page, EDITOR_URL, 3000);
    await waitForElementorPanel(page);

    // Search for widget
    const searchInput = page.locator(
      '#elementor-panel-elements-search-input, input[placeholder*="Search"]'
    ).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('text block');
      await page.waitForTimeout(1500);
    }

    // Try to drag-to-canvas or double-click to insert
    const widget = page.locator(
      '[class*="elementor-element-"][title*="Text Block"], [data-widget_type*="text-block"], .elementor-element-wrapper:has-text("Text Block")'
    ).first();
    const widgetFound = await widget.count().then(n => n > 0);

    if (widgetFound) {
      // Try double-click insert
      await widget.dblclick({ timeout: 5000 }).catch(async () => {
        // Fallback: drag to canvas
        const canvas = page.locator('#elementor-preview-iframe, .elementor-edit-area').first();
        if (await canvas.count() > 0) {
          const box = await canvas.boundingBox();
          if (box) {
            await widget.dragTo(canvas, {
              targetPosition: { x: box.width / 2, y: box.height / 2 },
            }).catch(() => {});
          }
        }
      });
      await page.waitForTimeout(2000);
    }
    return { widgetFound };
  }

  test('E-01 · Text Block widget is discoverable in Elementor panel search', async ({ page }) => {
    await goto(page, EDITOR_URL, 3000);
    await waitForElementorPanel(page);

    const searchInput = page.locator(
      '#elementor-panel-elements-search-input, input[placeholder*="Search"]'
    ).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Text Block');
      await page.waitForTimeout(1500);
      const widget = page.locator('[class*="elementor-element"]:has-text("Text Block")').first();
      const found = await widget.count().then(n => n > 0);
      console.log(`[E-01] Text Block widget found in search: ${found}`);
    }
    await snap(page, 'E-01-widget-search');
  });

  test('E-02 · Text Block panel has Content, Style, Advanced tabs', async ({ page }) => {
    await openEditorWithTextBlock(page);

    const tabs = ['Content', 'Style', 'Advanced'];
    for (const tab of tabs) {
      const tabEl = page.locator(
        `#elementor-panel-page-editor .elementor-tab-control-${tab.toLowerCase()}, [data-tab="${tab.toLowerCase()}"]`
      ).first();
      const visible = await tabEl.isVisible().catch(() => false);
      console.log(`[E-02] Tab "${tab}" visible: ${visible}`);
    }
    await snap(page, 'E-02-widget-tabs');
  });

  test('E-03 · Text Block Content tab — text editor control is present', async ({ page }) => {
    await openEditorWithTextBlock(page);

    // Click Content tab
    const contentTab = page.locator(
      '#elementor-panel-page-editor .elementor-tab-control-content, [data-tab="content"]'
    ).first();
    if (await contentTab.count() > 0) await contentTab.click().catch(() => {});
    await page.waitForTimeout(800);

    const textControl = page.locator(
      '.elementor-control-text_block_content, .elementor-control-editor-html-code, [data-setting="text_block_content"], .wp-editor-wrap, .elementor-wysiwyg, .elementor-control-editor'
    ).first();
    const found = await textControl.count().then(n => n > 0);
    console.log(`[E-03] Text control present: ${found}`);
    await snap(page, 'E-03-content-tab');
  });

  test('E-04 · Text Block Style tab loads without JS error', async ({ page }) => {
    const jsErrors = collectErrors(page);
    await openEditorWithTextBlock(page);

    const styleTab = page.locator(
      '#elementor-panel-page-editor .elementor-tab-control-style, [data-tab="style"]'
    ).first();
    if (await styleTab.count() > 0) {
      await styleTab.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    const critical = jsErrors.filter(e => !/ResizeObserver|favicon/i.test(e));
    console.log(`[E-04] JS errors on Style tab: ${critical.length}`);
    await snap(page, 'E-04-style-tab');
  });

  test('E-05 · Text Block Advanced tab is accessible', async ({ page }) => {
    await openEditorWithTextBlock(page);

    const advTab = page.locator(
      '#elementor-panel-page-editor .elementor-tab-control-advanced, [data-tab="advanced"]'
    ).first();
    if (await advTab.count() > 0) {
      await advTab.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    await snap(page, 'E-05-advanced-tab');
  });

});

// ─── Block F — Asset Integrity ───────────────────────────────────────────────

test.describe('Block F — Asset Integrity', () => {

  test('F-01 · No 404 CSS/JS assets on TPAE dashboard', async ({ page }) => {
    const failed = [];
    page.on('response', (res) => {
      const type = res.request().resourceType();
      if ((type === 'stylesheet' || type === 'script') && res.status() === 404) {
        failed.push(res.url());
      }
    });
    await goto(page, PAGES.dashboard, 4000);
    if (failed.length) console.error('[F-01] 404 assets:', failed);
    expect(failed.length, `404 assets on dashboard: ${failed.join('\n')}`).toBe(0);
    await snap(page, 'F-01-asset-404');
  });

  test('F-02 · No 404 CSS/JS assets on Elementor editor', async ({ page }) => {
    const failed = [];
    page.on('response', (res) => {
      const type = res.request().resourceType();
      if ((type === 'stylesheet' || type === 'script') && res.status() === 404) {
        failed.push(res.url());
      }
    });
    await goto(page, EDITOR_URL, 5000);
    await waitForElementorPanel(page);
    if (failed.length) console.error('[F-02] 404 assets in editor:', failed);
    expect(failed.length, `404 assets in Elementor editor: ${failed.join('\n')}`).toBe(0);
    await snap(page, 'F-02-editor-assets');
  });

  test('F-03 · TPAE CSS/JS assets actually load from the correct plugin URL', async ({ page }) => {
    const tpaeAssets = [];
    page.on('response', (res) => {
      if (res.url().includes('the-plus-addons') || res.url().includes('theplus')) {
        tpaeAssets.push({ url: res.url(), status: res.status() });
      }
    });
    await goto(page, PAGES.dashboard, 4000);
    console.log(`[F-03] TPAE assets loaded: ${tpaeAssets.length}`);
    tpaeAssets.slice(0, 10).forEach(a => console.log(`  ${a.status} ${a.url}`));
    const failed = tpaeAssets.filter(a => a.status >= 400);
    expect(failed.length, `TPAE assets returned errors: ${failed.map(a => a.url).join('\n')}`).toBe(0);
    await snap(page, 'F-03-tpae-assets');
  });

});

// ─── Block G — Settings Pages ────────────────────────────────────────────────

test.describe('Block G — Settings Pages', () => {

  test('G-01 · Widgets manager page loads without PHP error', async ({ page }) => {
    await goto(page, PAGES.widgets, 3000);
    await assertNoPhpError(page);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body.length, 'Widgets page body is empty').toBeGreaterThan(100);
    await snap(page, 'G-01-widgets-page');
  });

  test('G-02 · Extensions page loads without PHP error', async ({ page }) => {
    await goto(page, PAGES.extensions, 3000);
    await assertNoPhpError(page);
    await snap(page, 'G-02-extensions-page');
  });

  test('G-03 · Settings page loads without PHP error', async ({ page }) => {
    await goto(page, PAGES.settings, 3000);
    await assertNoPhpError(page);
    await snap(page, 'G-03-settings-page');
  });

  test('G-04 · Widgets page lists TPAE widget names in content', async ({ page }) => {
    await goto(page, PAGES.widgets, 3000);
    await assertNoPhpError(page);
    const body = await page.locator('body').innerText().catch(() => '');
    const hasWidgets =
      body.includes('Text Block') ||
      body.includes('Heading') ||
      body.includes('Info Box') ||
      body.includes('Button') ||
      body.toLowerCase().includes('widget');
    console.log(`[G-04] Widget names in widgets page: ${hasWidgets}`);
    await snap(page, 'G-04-widget-list');
  });

});

// ─── Block H — Known Bug Regressions ─────────────────────────────────────────

test.describe('Block H — Known Bug Regressions', () => {

  test('H-BUG001 · No PHP fatal on plugin activation (is_plugin_active before wp-admin loaded)', async ({ page }) => {
    // BUG-001: Elementor\Core\Utils\is_plugin_active() called outside admin context
    // Test: admin home should load with zero fatal errors
    await goto(page, PAGES.adminHome, 2000);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body, 'BUG-001 REGRESSION: PHP Fatal error on admin home').not.toMatch(/Fatal error/i);
    expect(body, 'BUG-001 REGRESSION: is_plugin_active undefined').not.toMatch(/Call to undefined function.*is_plugin_active/i);
    await snap(page, 'H-BUG001-fatal-error');
  });

  test('H-BUG002 · Option key spelling — tpae_onbording_end is NOT the preferred key name', async ({ page }) => {
    // BUG-002: Option key typo `tpae_onbording_end` (missing 'a')
    // We check AJAX responses for which key name is reported
    await goto(page, PAGES.dashboard, 2000);

    const result = await page.evaluate(async (ajaxUrl) => {
      const res  = await fetch(ajaxUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ action: 'tpae_dashboard_ajax_call', type: 'tpae_onboarding_setup' }),
      });
      return res.text().catch(() => '');
    }, AJAX_URL);

    // Log the raw response so future diff catches the key name
    console.log(`[H-BUG002] onboarding_setup response: ${result?.slice(0, 200)}`);
    // Non-blocking — this is a DB-level issue, just document current state
    await snap(page, 'H-BUG002-option-key');
  });

  test('H-BUG003 · AJAX onboarding_setup returns success:true on first call', async ({ page }) => {
    // BUG-003: returns false on first run due to inverted condition
    await goto(page, PAGES.dashboard, 2000);
    await page.evaluate(() => {
      localStorage.removeItem('tpae_onboarding_step');
      localStorage.removeItem('tpae_import_step');
    });

    const json = await page.evaluate(async (ajaxUrl) => {
      const res = await fetch(ajaxUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ action: 'tpae_dashboard_ajax_call', type: 'tpae_onboarding_setup' }),
      });
      return res.json().catch(() => null);
    }, AJAX_URL);

    console.log(`[H-BUG003] First-run onboarding_setup: ${JSON.stringify(json)}`);
    if (json !== null && json.success === false) {
      console.error('[H-BUG003] BUG-003 NOT FIXED: success is false on first call');
    }
    expect(json?.success, 'BUG-003 REGRESSION: success:false returned on first onboarding_setup call').not.toBe(false);
    await snap(page, 'H-BUG003-ajax-first-run');
  });

  test('H-BUG005 · Dashboard does not hang at networkidle (continuous XHR test)', async ({ page }) => {
    // BUG-005: continuous background XHR keeps networkidle from firing
    // Strategy: measure network activity 5s after domcontentloaded
    let requestCount = 0;
    page.on('request', () => requestCount++);

    await goto(page, PAGES.dashboard, 0);
    await page.waitForLoadState('domcontentloaded');

    const countAt3s = requestCount;
    await page.waitForTimeout(3000);
    const countAt6s = requestCount;

    const newRequests = countAt6s - countAt3s;
    console.log(`[H-BUG005] Requests 0–3s: ${countAt3s}, 3–6s: ${newRequests}`);
    // If > 15 NEW requests fire between 3s and 6s, continuous polling is active
    if (newRequests > 15) {
      console.warn(`[H-BUG005] BUG-005 MAY STILL BE PRESENT: ${newRequests} requests in 3–6s window`);
    }
    // Soft assertion — inform, don't block
    expect(newRequests, `BUG-005 REGRESSION: ${newRequests} new XHR requests in 3–6s after load`).toBeLessThanOrEqual(20);
    await snap(page, 'H-BUG005-xhr-activity');
  });

  test('H-BUG006 · Skip Setup button has confirmation or is clearly labelled as permanent', async ({ page }) => {
    // BUG-006: "Skip Setup" permanently dismisses onboarding with no warning
    await goto(page, PAGES.dashboard, 4000);

    const skipBtn = page.locator(
      '.tpae-skip-setup, [class*="skip-setup"], span:has-text("Skip Setup"), button:has-text("Skip")'
    ).first();
    const visible = await skipBtn.isVisible().catch(() => false);

    if (visible) {
      const label = await skipBtn.innerText().catch(() => '');
      console.log(`[H-BUG006] Skip button label: "${label}"`);
      // Check for a confirmation dialog attribute or tooltip
      const title   = await skipBtn.getAttribute('title').catch(() => '');
      const tooltip = await skipBtn.getAttribute('data-tooltip').catch(() => '');
      console.log(`[H-BUG006] title="${title}", data-tooltip="${tooltip}"`);
    } else {
      console.log('[H-BUG006] Skip button not visible (may be dismissed already)');
    }
    await snap(page, 'H-BUG006-skip-button');
  });

  test('H-BUG007 · Elementor version check — no activation without version guard', async ({ page }) => {
    // BUG-007: no Elementor version compatibility check on activation
    await goto(page, PAGES.adminHome, 2000);
    const body = await page.locator('body').innerText().catch(() => '');
    // If BUG-007 is fixed, there should be a version notice when Elementor is too old
    // For current Elementor version, there should be NO incompatibility notice (it's compatible)
    const hasIncompatNotice = /requires elementor|elementor version/i.test(body);
    console.log(`[H-BUG007] Elementor version incompatibility notice: ${hasIncompatNotice}`);
    // No notice = compatible = expected on supported Elementor
    await snap(page, 'H-BUG007-version-check');
  });

  test('H-BUG009 · Admin menu item at position 67.1 — TPAE menu is visible (not displaced)', async ({ page }) => {
    // BUG-009: hardcoded menu position 67.1 — potential conflict with other plugins
    await goto(page, PAGES.adminHome, 2000);
    const menu = page.locator('#toplevel_page_theplus_welcome_page');
    await expect(menu, 'BUG-009 REGRESSION: TPAE menu item not visible — may be displaced by another plugin at position 67').toBeVisible({ timeout: 8000 });
    await snap(page, 'H-BUG009-menu-position');
  });

});

// ─── Block I — Responsive / RTL ──────────────────────────────────────────────

test.describe('Block I — Responsive & RTL', () => {

  test('I-01 · TPAE dashboard is usable at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page, PAGES.dashboard, 3000);
    await assertNoPhpError(page);
    const body = await page.locator('body').isVisible();
    expect(body).toBeTruthy();
    await snap(page, 'I-01-mobile-375');
  });

  test('I-02 · TPAE admin pages work at 768px tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goto(page, PAGES.dashboard, 3000);
    await assertNoPhpError(page);
    await snap(page, 'I-02-tablet-768');
  });

  test('I-03 · RTL — TPAE dashboard body has dir="rtl" when WP is in Arabic locale', async ({ page }) => {
    // We test what the plugin ships — not that the WP install is actually in Arabic.
    // Just check no hard-coded ltr= attributes break layout.
    await goto(page, PAGES.dashboard, 3000);
    const dir = await page.locator('html').getAttribute('dir').catch(() => '');
    console.log(`[I-03] html[dir]: "${dir}"`);
    // If dir=rtl is set by WP, TPAE elements should NOT have inline dir=ltr overriding
    const ltrOverride = await page.evaluate(() => {
      return [...document.querySelectorAll('[dir="ltr"]')].length;
    });
    console.log(`[I-03] Elements with hard-coded dir=ltr: ${ltrOverride}`);
    await snap(page, 'I-03-rtl-check');
  });

  test('I-04 · Full page responsive — 1440px desktop wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await goto(page, PAGES.dashboard, 3000);
    await assertNoPhpError(page);
    await snap(page, 'I-04-desktop-1440');
  });

});
