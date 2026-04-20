/**
 * Orbit — UAT Flow Mapping: Nexter SEO vs RankMath
 *
 * Records video of every journey. Saves screenshots to reports/screenshots/flows-compare/
 * Generates data consumed by generate-compare-report.js for the HTML report.
 *
 * Run:
 *   npx playwright test tests/playwright/flows/nexter-vs-rankmath.spec.js --project=video
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE  = process.env.WP_TEST_URL || 'http://localhost:8881';
const ADMIN = `${BASE}/wp-admin`;
const SNAP  = path.join(__dirname, '../../../reports/screenshots/flows-compare');
const DATA  = path.join(__dirname, '../../../reports/compare-data.json');

fs.mkdirSync(SNAP, { recursive: true });

const results = { nexter: {}, rankmath: {}, meta: { date: new Date().toISOString(), base: BASE } };

function saveData() {
  fs.writeFileSync(DATA, JSON.stringify(results, null, 2));
}

async function screenshot(page, name) {
  const safe = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const file = path.join(SNAP, `${safe}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function fullShot(page, name) {
  const safe = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const file = path.join(SNAP, `${safe}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

// ─── NEXTER SEO FLOWS ────────────────────────────────────────────────────────

test.describe('NEXTER SEO — UAT Flows', () => {

  test('NXT-1 | Discovery — find SEO settings from admin dashboard', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await screenshot(page, 'nxt-01-dashboard');

    // Look for SEO in admin menu
    const menuItem = page.locator('#adminmenu a').filter({ hasText: /SEO|Nexter/i });
    const found = await menuItem.count();

    // Count clicks needed
    let clicks = 0;
    let foundSEO = false;

    if (found > 0) {
      clicks = 1;
      foundSEO = true;
      await menuItem.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await screenshot(page, 'nxt-02-menu-click');
    }

    results.nexter.discovery = {
      menuVisible: found > 0,
      label: found > 0 ? await menuItem.first().textContent() : null,
      clicksToReach: clicks,
      foundSEO,
    };
    saveData();

    // Check if we landed on SEO page
    const url = page.url();
    const onSEOPage = url.includes('nxt_content_seo') || url.includes('nexter');
    await screenshot(page, 'nxt-03-seo-page');

    results.nexter.discovery.landedOnSEO = onSEOPage;
    results.nexter.discovery.finalUrl = url;
    saveData();
  });

  test('NXT-2 | Settings Page — structure + complexity', async ({ page }) => {
    await page.goto(`${ADMIN}/admin.php?page=nxt_content_seo`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await fullShot(page, 'nxt-04-settings-full');

    const tabs     = await page.locator('[role="tab"], .nav-tab, .components-tab-panel__tabs button').count();
    const inputs   = await page.locator('input:not([type=hidden]):not([type=submit])').count();
    const toggles  = await page.locator('input[type=checkbox], input[type=radio]').count();
    const selects  = await page.locator('select').count();
    const sections = await page.locator('fieldset, .components-panel__body, .settings-section, .card').count();

    const complexity = (tabs * 3) + inputs + toggles + (selects * 2) + sections;

    // Check for React SPA mounting
    const reactMounted = await page.evaluate(() => {
      const el = document.querySelector('#nexter-content-seo, [data-react], .components-panel');
      return !!el;
    });

    // Scroll full page to capture all content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await fullShot(page, 'nxt-04b-settings-scrolled');
    await page.evaluate(() => window.scrollTo(0, 0));

    results.nexter.settings = { tabs, inputs, toggles, selects, sections, complexity, reactMounted };
    saveData();

    console.log(`\n[Nexter SEO] Complexity: ${complexity} | Tabs: ${tabs} | Inputs: ${inputs} | Toggles: ${toggles}`);
  });

  test('NXT-3 | Wizard / Onboarding — does it exist?', async ({ page }) => {
    await page.goto(`${ADMIN}/admin.php?page=nxt_content_seo`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const wizardSelector = 'text=wizard, text=setup, text=get started, text=quick setup, text=onboarding';
    const wizard = page.locator('a, button').filter({ hasText: /wizard|setup wizard|get started|onboarding/i });
    const wizardFound = await wizard.count() > 0;

    await screenshot(page, 'nxt-05-wizard-check');

    results.nexter.wizard = { exists: wizardFound };
    saveData();
  });

  test('NXT-4 | Post Editor — SEO panel in Gutenberg', async ({ page }) => {
    await page.goto(`${ADMIN}/post-new.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    await screenshot(page, 'nxt-06-editor-load');

    // Look for Nexter SEO panel in sidebar
    const seoPanel = page.locator('.nexter-seo, [class*="nexter"], .nxt-seo-panel').first();
    const seoPanelText = page.getByText('SEO Score').or(page.getByText('Focus Keyword')).first();
    const panelFound = (await seoPanel.count() > 0) || (await seoPanelText.count() > 0);

    // Open Document sidebar
    const sidebarBtn = page.locator('button[aria-label="Settings"]');
    if (await sidebarBtn.isVisible().catch(() => false)) {
      const isOpen = await page.locator('.interface-complementary-area').isVisible().catch(() => false);
      if (!isOpen) await sidebarBtn.click();
      await page.waitForTimeout(1000);
    }

    await screenshot(page, 'nxt-07-editor-sidebar');

    // Look for plugin tab in sidebar
    const pluginTab = page.locator('.edit-post-sidebar__panel-tabs button, .interface-complementary-area__header button').filter({ hasText: /nexter|SEO|nxt/i });
    const pluginTabFound = await pluginTab.count() > 0;

    // Scroll sidebar down
    await page.evaluate(() => {
      const sidebar = document.querySelector('.interface-complementary-area');
      if (sidebar) sidebar.scrollTop = 500;
    });
    await page.waitForTimeout(500);
    await screenshot(page, 'nxt-08-editor-sidebar-scrolled');

    results.nexter.editor = { panelFound, pluginTabFound };
    saveData();

    console.log(`[Nexter SEO] Editor panel found: ${panelFound} | Plugin tab: ${pluginTabFound}`);
  });

  test('NXT-5 | Sitemap — accessible and valid', async ({ page }) => {
    const sitemapUrl = `${BASE}/sitemap.xml`;
    const res = await page.goto(sitemapUrl);
    const status = res.status();
    const body = await page.content();
    const isXML = body.includes('<urlset') || body.includes('<sitemapindex');

    await screenshot(page, 'nxt-09-sitemap');

    results.nexter.sitemap = { status, isXML, url: sitemapUrl };
    saveData();
    console.log(`[Nexter SEO] Sitemap: ${sitemapUrl} → ${status} | XML: ${isXML}`);
  });

  test('NXT-6 | Schema — JSON-LD on frontend', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    const schemas = await page.evaluate(() => {
      return [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean);
    });

    const types = schemas.map(s => s['@type'] || (s['@graph'] ? s['@graph'].map(n => n['@type']) : '?')).flat();

    await screenshot(page, 'nxt-10-schema-frontend');

    results.nexter.schema = { count: schemas.length, types };
    saveData();
    console.log(`[Nexter SEO] Schema blocks: ${schemas.length} | Types: ${types.join(', ')}`);
  });

  test('NXT-7 | Meta Tags — OG + Twitter on frontend', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const ogTitle  = await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.content || null);
    const ogDesc    = await page.evaluate(() => document.querySelector('meta[property="og:description"]')?.content || null);
    const ogImage   = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.content || null);
    const twCard    = await page.evaluate(() => document.querySelector('meta[name="twitter:card"]')?.content || null);
    const metaDesc  = await page.evaluate(() => document.querySelector('meta[name="description"]')?.content || null);
    const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || null);

    results.nexter.meta = { ogTitle, ogDesc, ogImage, twCard, metaDesc, canonical };
    saveData();
    console.log(`[Nexter SEO] OG Title: ${ogTitle ? '✓' : '✗'} | OG Image: ${ogImage ? '✓' : '✗'} | Twitter: ${twCard ? '✓' : '✗'}`);
  });

  test('NXT-8 | IndexNow — settings reachable', async ({ page }) => {
    await page.goto(`${ADMIN}/admin.php?page=nxt_content_seo`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Find IndexNow tab/section
    const indexNowLink = page.locator('text=IndexNow, text=Indexing, text=Index Now').first();
    const found = await indexNowLink.count() > 0;
    let clickDepth = found ? 2 : 99; // 2 = dashboard + settings (IndexNow not separate menu)

    if (found) {
      await indexNowLink.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'nxt-11-indexnow');
    }

    results.nexter.indexnow = { reachable: found, clickDepth };
    saveData();
  });

  test('NXT-9 | Performance — settings page load time', async ({ page }) => {
    const t0 = Date.now();
    await page.goto(`${ADMIN}/admin.php?page=nxt_content_seo`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // wait for React to render

    // Check if React app fully painted
    const painted = await page.evaluate(() => {
      const el = document.querySelector('#nexter-content-seo');
      return el ? el.children.length > 0 : false;
    });

    const loadMs = Date.now() - t0;

    results.nexter.performance = { settingsLoadMs: loadMs, reactPainted: painted };
    saveData();
    console.log(`[Nexter SEO] Settings load: ${loadMs}ms | React painted: ${painted}`);
  });

});

// ─── RANKMATH FLOWS ──────────────────────────────────────────────────────────

test.describe('RANKMATH — UAT Flows', () => {

  test('RM-1 | Discovery — find SEO settings from admin dashboard', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await screenshot(page, 'rm-01-dashboard');

    // Check menu via JS to avoid viewport/timing issues
    const menuInfo = await page.evaluate(() => {
      const el = document.querySelector('#adminmenu a[href*="rank-math"]');
      return el ? { found: true, label: el.textContent.trim(), href: el.href } : { found: false };
    });

    let clicks = menuInfo.found ? 1 : 0;
    let foundSEO = menuInfo.found;

    if (menuInfo.found) {
      // Navigate directly (more reliable than clicking collapsed menu)
      await page.goto(`${ADMIN}/admin.php?page=rank-math`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await screenshot(page, 'rm-02-menu-click');
    }

    const url = page.url();
    results.rankmath.discovery = {
      menuVisible: menuInfo.found,
      label: menuInfo.label || 'Rank Math',
      clicksToReach: clicks,
      foundSEO,
      finalUrl: url,
    };
    saveData();
  });

  test('RM-2 | Setup Wizard — does it exist and work?', async ({ page }) => {
    // RankMath forces setup wizard on first run
    await page.goto(`${ADMIN}/admin.php?page=rank-math`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await screenshot(page, 'rm-03-dashboard');

    // Check for wizard
    const wizard = page.locator('text=Setup Wizard, text=Get Started, text=Easy Setup, .rank-math-wizard, a[href*="wizard"]').first();
    const wizardFound = await wizard.count() > 0;

    // Check for wizard redirect
    const currentUrl = page.url();
    const onWizard = currentUrl.includes('wizard') || currentUrl.includes('setup');

    // Look for setup button
    const setupBtn = page.locator('a:has-text("Run Setup Wizard"), a:has-text("Setup Wizard"), button:has-text("Setup")').first();
    const setupBtnFound = await setupBtn.count() > 0;

    if (setupBtnFound) {
      await screenshot(page, 'rm-04-wizard-button');
    }

    results.rankmath.wizard = { exists: wizardFound || setupBtnFound, onWizard, url: currentUrl };
    saveData();
    console.log(`[RankMath] Wizard: ${wizardFound || setupBtnFound} | On wizard page: ${onWizard}`);
  });

  test('RM-3 | Settings Page — structure + complexity', async ({ page }) => {
    await page.goto(`${ADMIN}/admin.php?page=rank-math`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await fullShot(page, 'rm-05-settings-full');

    const tabs     = await page.locator('[role="tab"], .nav-tab, .rank-math-tabs a, .cmb-tab-label').count();
    const inputs   = await page.locator('input:not([type=hidden]):not([type=submit])').count();
    const toggles  = await page.locator('input[type=checkbox], input[type=radio], .cmb-row-toggle').count();
    const selects  = await page.locator('select').count();
    const sections = await page.locator('fieldset, .cmb-panel, .rank-math-section, .rank-math-box').count();

    const complexity = (tabs * 3) + inputs + toggles + (selects * 2) + sections;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await fullShot(page, 'rm-05b-settings-scrolled');
    await page.evaluate(() => window.scrollTo(0, 0));

    results.rankmath.settings = { tabs, inputs, toggles, selects, sections, complexity };
    saveData();
    console.log(`\n[RankMath] Complexity: ${complexity} | Tabs: ${tabs} | Inputs: ${inputs} | Toggles: ${toggles}`);
  });

  test('RM-4 | Post Editor — SEO panel in Gutenberg', async ({ page }) => {
    await page.goto(`${ADMIN}/post-new.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    await screenshot(page, 'rm-06-editor-load');

    // RankMath adds a bottom panel
    const seoPanel = page.locator('.rank-math-editor, .rank-math-gutenberg-panel, [class*="rank-math"]').first();
    const panelFound = await seoPanel.count() > 0;

    // Open sidebar
    const sidebarBtn = page.locator('button[aria-label="Settings"]');
    if (await sidebarBtn.isVisible().catch(() => false)) {
      const isOpen = await page.locator('.interface-complementary-area').isVisible().catch(() => false);
      if (!isOpen) await sidebarBtn.click();
      await page.waitForTimeout(1000);
    }

    await screenshot(page, 'rm-07-editor-sidebar');

    // RankMath bottom meta box
    const bottomBox = page.locator('#rank-math-metabox, .rank-math-metabox-wrap, .rank-math-tabs').first();
    const bottomFound = await bottomBox.count() > 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, 'rm-08-editor-bottom');

    results.rankmath.editor = { panelFound, bottomBoxFound: bottomFound };
    saveData();
    console.log(`[RankMath] Editor panel: ${panelFound} | Bottom meta box: ${bottomFound}`);
  });

  test('RM-5 | Sitemap — accessible and valid', async ({ page }) => {
    const sitemapUrl = `${BASE}/sitemap_index.xml`;
    const res = await page.goto(sitemapUrl);
    const status = res.status();
    const body = await page.content();
    const isXML = body.includes('<sitemapindex') || body.includes('<urlset');

    await screenshot(page, 'rm-09-sitemap');

    results.rankmath.sitemap = { status, isXML, url: sitemapUrl };
    saveData();
    console.log(`[RankMath] Sitemap: ${sitemapUrl} → ${status} | XML: ${isXML}`);
  });

  test('RM-6 | Schema — JSON-LD on frontend', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    const schemas = await page.evaluate(() => {
      return [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean);
    });

    const types = schemas.map(s => s['@type'] || (s['@graph'] ? s['@graph'].map(n => n['@type']) : '?')).flat();

    await screenshot(page, 'rm-10-schema-frontend');

    results.rankmath.schema = { count: schemas.length, types };
    saveData();
    console.log(`[RankMath] Schema blocks: ${schemas.length} | Types: ${types.join(', ')}`);
  });

  test('RM-7 | Meta Tags — OG + Twitter on frontend', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const ogTitle   = await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.content || null);
    const ogDesc    = await page.evaluate(() => document.querySelector('meta[property="og:description"]')?.content || null);
    const ogImage   = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.content || null);
    const twCard    = await page.evaluate(() => document.querySelector('meta[name="twitter:card"]')?.content || null);
    const metaDesc  = await page.evaluate(() => document.querySelector('meta[name="description"]')?.content || null);
    const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || null);

    results.rankmath.meta = { ogTitle, ogDesc, ogImage, twCard, metaDesc, canonical };
    saveData();
    console.log(`[RankMath] OG Title: ${ogTitle ? '✓' : '✗'} | OG Image: ${ogImage ? '✓' : '✗'} | Twitter: ${twCard ? '✓' : '✗'}`);
  });

  test('RM-8 | Performance — settings page load time', async ({ page }) => {
    const t0 = Date.now();
    await page.goto(`${ADMIN}/admin.php?page=rank-math`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const loadMs = Date.now() - t0;

    results.rankmath.performance = { settingsLoadMs: loadMs };
    saveData();
    console.log(`[RankMath] Settings load: ${loadMs}ms`);
  });

});
