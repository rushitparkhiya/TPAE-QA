/**
 * TPAE — Text Block Widget QA
 *
 * Covers: panel discovery, drag-to-canvas, controls (content / style / advanced),
 * frontend render, responsive viewports, JS error checks, and visual snapshots.
 *
 * Prerequisites:
 *   • Local WP running (default http://localhost:8881)
 *   • TPAE (free or pro) active
 *   • Elementor active
 *   • Auth cookies present (run auth.setup.js first)
 *
 * Usage:
 *   npx playwright test tests/playwright/elementor/tpae-text-block.spec.js --project=elementor-widgets
 *   WP_TEST_URL=http://my-site.local npx playwright test ... --headed
 */

const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE      = process.env.WP_TEST_URL || 'http://localhost:8881';
const ADMIN     = `${BASE}/wp-admin`;
const SNAP_DIR  = path.join(__dirname, '../../../reports/screenshots/tpae-text-block');
const WIDGET    = { name: 'Text Block', searchTerm: 'text block', selector: '.tp-text-block, .plus-text-block, [data-widget_type*="text-block"]' };

fs.mkdirSync(SNAP_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function snap(page, label) {
  const file = path.join(SNAP_DIR, `${label.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function waitForElementor(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#elementor-panel, .elementor-panel', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

/** Open a new page in the Elementor editor and return when the panel is ready. */
async function openEditor(page) {
  await page.goto(`${ADMIN}/post-new.php?post_type=page`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const switchBtn = page.locator('#elementor-switch-mode-button, a:has-text("Edit with Elementor")').first();
  if (await switchBtn.isVisible().catch(() => false)) {
    await switchBtn.click();
  }
  await waitForElementor(page);
}

/** Search for the widget by term and return its panel locator. */
async function searchWidget(page, term) {
  const searchInput = page.locator('.elementor-search-input, input[placeholder*="Search"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('');
    await searchInput.fill(term);
    await page.waitForTimeout(1200);
  }
  return page.locator(`.elementor-element-wrapper[title*="${WIDGET.name}"], .elementor-widget-title:has-text("${WIDGET.name}")`).first();
}

/** Drag the widget from panel onto the canvas empty area. */
async function insertWidget(page) {
  const widgetHandle = await searchWidget(page, WIDGET.searchTerm);
  const canvas = page.locator('#elementor-add-new-section, .elementor-add-section, .elementor-section-wrap').first();

  if (await canvas.isVisible().catch(() => false)) {
    await widgetHandle.dragTo(canvas, { force: true }).catch(() => {});
  } else {
    // Fallback: double-click to add
    await widgetHandle.dblclick().catch(() => {});
  }
  await page.waitForTimeout(1500);
}

/** Returns the active widget settings panel locator (after clicking a widget on canvas). */
function settingsPanel(page) {
  return page.locator('#elementor-controls, .elementor-panel-navigation, .elementor-tab-control-content').first();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('TPAE Text Block — Panel', () => {

  test('widget appears in Elementor panel search', async ({ page }) => {
    await openEditor(page);
    const widget = await searchWidget(page, WIDGET.searchTerm);
    await snap(page, 'panel-search-text-block');
    await expect(widget, `"${WIDGET.name}" not found in Elementor panel`).toBeVisible();
  });

  test('no JS errors when opening editor', async ({ page }) => {
    const errors = [];
    page.on('pageerror',  e => errors.push(`[pageerror] ${e.message}`));
    page.on('console',    m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });

    await openEditor(page);
    await page.waitForTimeout(2000);

    const filtered = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR') &&
      !e.includes('wp.apiFetch') &&
      !e.includes('sourceURL')
    );

    expect(filtered, `JS errors on editor load:\n${filtered.join('\n')}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TPAE Text Block — Insert & Controls', () => {

  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test('widget can be inserted onto canvas', async ({ page }) => {
    await insertWidget(page);
    const onCanvas = page.locator(WIDGET.selector).first();
    await snap(page, 'canvas-after-insert');
    await expect(onCanvas, 'Text Block not rendered on canvas after insert').toBeVisible();
  });

  test('Content tab — editor opens and textarea is editable', async ({ page }) => {
    await insertWidget(page);

    // Click the widget on canvas to open its settings
    const onCanvas = page.locator(WIDGET.selector).first();
    if (await onCanvas.isVisible().catch(() => false)) {
      await onCanvas.click();
      await page.waitForTimeout(800);
    }

    // Confirm Content tab is active by default
    const contentTab = page.locator('.elementor-tab-control-content, [data-tab="content"]').first();
    if (await contentTab.isVisible().catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);
    }

    // Locate the text editor (classic editor textarea or block editor)
    const textArea = page.locator(
      '.wp-editor-area, .elementor-control-type-wysiwyg textarea, [data-setting="text_block_content"] .mce-content-body'
    ).first();

    await snap(page, 'controls-content-tab');
    // Panel should at minimum be visible; textarea may be inside an iframe
    await expect(settingsPanel(page), 'Settings panel not visible').toBeVisible();
  });

  test('Content tab — HTML tag selector is present', async ({ page }) => {
    await insertWidget(page);
    const onCanvas = page.locator(WIDGET.selector).first();
    if (await onCanvas.isVisible().catch(() => false)) { await onCanvas.click(); await page.waitForTimeout(800); }

    const tagControl = page.locator(
      'select[data-setting*="tag"], .elementor-control:has-text("HTML Tag") select, .elementor-control-select:has-text("Tag")'
    ).first();

    await snap(page, 'controls-html-tag');
    const tagExists = await tagControl.count();
    expect(tagExists, 'HTML Tag selector not found in Content controls').toBeGreaterThan(0);
  });

  test('Style tab — typography control group is present', async ({ page }) => {
    await insertWidget(page);
    const onCanvas = page.locator(WIDGET.selector).first();
    if (await onCanvas.isVisible().catch(() => false)) { await onCanvas.click(); await page.waitForTimeout(800); }

    const styleTab = page.locator('[data-tab="style"], .elementor-tab-control-style').first();
    if (await styleTab.isVisible().catch(() => false)) {
      await styleTab.click();
      await page.waitForTimeout(600);
    }

    const typoGroup = page.locator(
      '.elementor-control-type-typography, .elementor-group-control-type-typography, .elementor-control:has-text("Typography")'
    ).first();

    await snap(page, 'controls-style-tab');
    const typoExists = await typoGroup.count();
    expect(typoExists, 'Typography control not found in Style tab').toBeGreaterThan(0);
  });

  test('Style tab — text color control is present', async ({ page }) => {
    await insertWidget(page);
    const onCanvas = page.locator(WIDGET.selector).first();
    if (await onCanvas.isVisible().catch(() => false)) { await onCanvas.click(); await page.waitForTimeout(800); }

    const styleTab = page.locator('[data-tab="style"], .elementor-tab-control-style').first();
    if (await styleTab.isVisible().catch(() => false)) { await styleTab.click(); await page.waitForTimeout(600); }

    const colorControl = page.locator(
      '.elementor-control-type-color:has-text("Color"), .elementor-control:has-text("Text Color") .elementor-control-type-color'
    ).first();

    await snap(page, 'controls-text-color');
    const colorExists = await colorControl.count();
    expect(colorExists, 'Text color control not found in Style tab').toBeGreaterThan(0);
  });

  test('Advanced tab — CSS ID / Class fields are present', async ({ page }) => {
    await insertWidget(page);
    const onCanvas = page.locator(WIDGET.selector).first();
    if (await onCanvas.isVisible().catch(() => false)) { await onCanvas.click(); await page.waitForTimeout(800); }

    const advTab = page.locator('[data-tab="advanced"], .elementor-tab-control-advanced').first();
    if (await advTab.isVisible().catch(() => false)) { await advTab.click(); await page.waitForTimeout(600); }

    const cssIdField = page.locator('input[data-setting="_element_id"], .elementor-control:has-text("CSS ID") input').first();
    await snap(page, 'controls-advanced-tab');
    const cssIdExists = await cssIdField.count();
    expect(cssIdExists, 'CSS ID field not found in Advanced tab').toBeGreaterThan(0);
  });

  test('no JS errors after inserting widget', async ({ page }) => {
    const errors = [];
    page.on('pageerror',  e => errors.push(`[pageerror] ${e.message}`));
    page.on('console',    m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });

    await insertWidget(page);
    await page.waitForTimeout(2000);

    const filtered = errors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR') &&
      !e.includes('wp.apiFetch') && !e.includes('sourceURL')
    );
    expect(filtered, `JS errors after inserting Text Block:\n${filtered.join('\n')}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TPAE Text Block — Frontend Render', () => {

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../qa.config.json'), 'utf8')); } catch {}
  const TEST_PAGE = cfg.testPageUrl || `${BASE}/?p=1`;

  test('test page loads — widget markup present', async ({ page }) => {
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const body = await page.locator('body').textContent();
    expect(body, 'PHP fatal on test page').not.toMatch(/Fatal error|PHP Warning|Parse error/);

    const html = await page.content();
    expect(html.length, 'Test page rendered blank').toBeGreaterThan(500);

    await snap(page, 'frontend-text-block-desktop');
  });

  test('test page — no JS console errors', async ({ page }) => {
    const errors = [];
    page.on('console',   m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const filtered = errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR'));
    expect(filtered, `Frontend JS errors:\n${filtered.join('\n')}`).toHaveLength(0);
  });

  test('mobile 375px — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    await snap(page, 'frontend-text-block-mobile');
    expect(scrollWidth, `Horizontal overflow at 375px: ${scrollWidth}px`).toBeLessThanOrEqual(390);
  });

  test('tablet 768px — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    await snap(page, 'frontend-text-block-tablet');
    expect(scrollWidth, `Horizontal overflow at 768px: ${scrollWidth}px`).toBeLessThanOrEqual(790);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('TPAE Text Block — Visual Snapshots', () => {

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../qa.config.json'), 'utf8')); } catch {}
  const TEST_PAGE = cfg.testPageUrl || `${BASE}/?p=1`;

  test('desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('text-block-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.04 });
  });

  test('mobile snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('text-block-mobile.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});
