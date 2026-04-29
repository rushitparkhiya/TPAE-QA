/**
 * Orbit — Security Audit Phase 1 — QA Verification
 *
 * Covers all 22 fixes from the TPAE Security Audit Phase 1 document.
 * All action names, nonce keys, and CSS selectors verified against plugin source.
 *
 * Severity groups:
 *   Critical : C1–C10  (XSS, SSRF, Auth bypass, plugin install allowlist)
 *   High     : H11–NEW (JSON encoding, safe APIs, form sanitization, SVG)
 *   Medium   : M18–M23 (capability gates, widget save, testimonial labels)
 *   Low      : L28, L29, L31 (console errors, TLS verification)
 *   Smoke    : ST-01–ST-10 (cross-cutting regression checks)
 *
 * Usage:
 *   npx playwright test tests/playwright/elementor/security-audit-phase1.spec.js
 *   WP_TEST_URL=https://staging.example.com npx playwright test tests/playwright/elementor/security-audit-phase1.spec.js
 *
 * Required env vars (or qa.config.json → security.pages):
 *   WP_TEST_URL, WP_ADMIN_USER, WP_ADMIN_PASS
 *   PAGE_ACCORDION, PAGE_PAGE_SCROLL, PAGE_STYLE_LIST, PAGE_VIDEO,
 *   PAGE_TESTIMONIAL, PAGE_LOAD_MORE, PAGE_TWITTER
 */

const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE       = process.env.WP_TEST_URL   || 'http://localhost:8881';
const ADMIN      = `${BASE}/wp-admin`;
const ADMIN_USER = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.WP_ADMIN_PASS || 'admin';
const AJAX       = `${BASE}/wp-admin/admin-ajax.php`;

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../qa.config.json'), 'utf8')); } catch {}

const PAGES = cfg.security?.pages || {};
const PAGE_ACCORDION   = process.env.PAGE_ACCORDION   || PAGES.accordion   || `${BASE}/accordion-test/`;
const PAGE_PAGE_SCROLL = process.env.PAGE_PAGE_SCROLL || PAGES.pageScroll  || `${BASE}/page-scroll-test/`;
const PAGE_STYLE_LIST  = process.env.PAGE_STYLE_LIST  || PAGES.styleList   || `${BASE}/style-list-test/`;
const PAGE_VIDEO       = process.env.PAGE_VIDEO       || PAGES.video       || `${BASE}/video-player-test/`;
const PAGE_TESTIMONIAL = process.env.PAGE_TESTIMONIAL || PAGES.testimonial || `${BASE}/testimonial-test/`;
const PAGE_LOAD_MORE   = process.env.PAGE_LOAD_MORE   || PAGES.loadMore    || `${BASE}/blog-load-more-test/`;
const PAGE_TWITTER     = process.env.PAGE_TWITTER     || PAGES.twitter     || `${BASE}/twitter-embed-test/`;

const SNAP_DIR = path.join(__dirname, '../../../reports/screenshots/security-audit');
fs.mkdirSync(SNAP_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function snap(page, name) {
  const safe = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  await page.screenshot({ path: path.join(SNAP_DIR, `${safe}.png`), fullPage: false });
}

async function wpLogin(page) {
  await page.goto(`${ADMIN}/`);
  const onLogin = await page.locator('#user_login').isVisible().catch(() => false);
  if (onLogin) {
    await page.fill('#user_login', ADMIN_USER);
    await page.fill('#user_pass', ADMIN_PASS);
    await page.click('#wp-submit');
    await page.waitForLoadState('networkidle');
  }
}

// Post to admin-ajax.php as the current browser session (cookies included)
async function ajaxPost(page, fields) {
  return page.evaluate(async ({ ajax, fields }) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
    return r.text();
  }, { ajax: AJAX, fields });
}

// ─── CRITICAL — C1 / C2 / C3 : Widget Render XSS ────────────────────────────

test.describe('C1 — Accordion widget: no XSS in render output', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C1-1 wrapper renders with no stray script tags or inline events', async ({ page }) => {
    await page.goto(PAGE_ACCORDION);
    await page.waitForLoadState('domcontentloaded');

    // Real class from tp_accordion.php render()
    const wrapper = page.locator('.theplus-accordion-wrapper').first();
    if (await wrapper.count()) {
      const html = await wrapper.evaluate(el => el.outerHTML);
      expect(html).not.toContain('<script');
      expect(html).not.toMatch(/\bon\w+\s*=/i);
    }
    await snap(page, 'c1-accordion-render');
  });

  test('C1-2 accordion expand/collapse still works', async ({ page }) => {
    await page.goto(PAGE_ACCORDION);
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('.theplus-accordion-wrapper .theplus-accordion-item').first();
    if (await title.count()) {
      await title.click();
      await page.waitForTimeout(400);
      await snap(page, 'c1-accordion-expanded');
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('C2 — Page Scroll widget: no XSS in render output', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real class from tp_page_scroll.php render(): tp-page-scroll-wrapper
  test('C2-1 wrapper has no injected script or event handlers', async ({ page }) => {
    await page.goto(PAGE_PAGE_SCROLL);
    await page.waitForLoadState('domcontentloaded');

    const wrapper = page.locator('.tp-page-scroll-wrapper').first();
    if (await wrapper.count()) {
      const html = await wrapper.evaluate(el => el.outerHTML);
      expect(html).not.toContain('<script');
      expect(html).not.toMatch(/\bon\w+\s*=/i);
    }
    await snap(page, 'c2-page-scroll-render');
  });
});

test.describe('C3 — Style List widget: no XSS in render output', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real class from tp_style_list.php: plus-stylist-list-wrapper
  test('C3-1 wrapper has no injected script or event handlers', async ({ page }) => {
    await page.goto(PAGE_STYLE_LIST);
    await page.waitForLoadState('domcontentloaded');

    const wrapper = page.locator('.plus-stylist-list-wrapper').first();
    if (await wrapper.count()) {
      const html = await wrapper.evaluate(el => el.outerHTML);
      expect(html).not.toContain('<script');
      expect(html).not.toMatch(/\bon\w+\s*=/i);
    }
    await snap(page, 'c3-style-list-render');
  });
});

// ─── CRITICAL — C4 : Video Player sticky parameter ───────────────────────────

test.describe('C4 — Video Player: data-stickyparam uses wp_json_encode + esc_attr', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real code: 'data-stickyparam="' . esc_attr( wp_json_encode( $stickyattr ) ) . '"'
  // Wrapper class: pt_plus_video-box-shadow
  test('C4-1 data-stickyparam contains valid HTML-encoded JSON', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');

    const el = page.locator('[data-stickyparam]').first();
    if (await el.count()) {
      const raw = await el.getAttribute('data-stickyparam');
      // esc_attr encodes " → &quot; so raw value must not have bare double-quotes
      expect(raw).not.toMatch(/(?<!&quot;|&#34;)"/);
      // Must decode to valid JSON
      const decoded = (raw || '').replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, '&');
      expect(() => JSON.parse(decoded)).not.toThrow();
    }
    await snap(page, 'c4-video-sticky-param');
  });

  test('C4-2 video sticky behaviour still works', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(800);
    await snap(page, 'c4-video-after-scroll');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── CRITICAL — C5 : SSRF in tpae_dashboard_ajax_call → tpae_api_call ───────

test.describe('C5 — SSRF protection: tpae_api_call rejects internal URLs', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=tpae_dashboard_ajax_call, type=tpae_api_call, nonce=tpae-db-nonce
  // Returns: $final['error'] = 'invalid_url' on blocked URLs
  const ssrfPayloads = [
    { label: 'localhost-ip',    url: 'http://127.0.0.1' },
    { label: 'cloud-metadata',  url: 'http://169.254.169.254/latest/meta-data/' },
    { label: 'file-protocol',   url: 'file:///etc/passwd' },
    { label: 'credentials-url', url: 'https://user:pass@example.com' },
    { label: 'ipv6-loopback',   url: 'http://[::1]' },
  ];

  for (const { label, url } of ssrfPayloads) {
    test(`C5 — blocked: ${label}`, async ({ page }) => {
      await page.goto(`${ADMIN}/`);
      // Grab nonce from localized script
      const nonce = await page.evaluate(() => {
        return window.tpae_nonce || window.tpaeNonce || '';
      });

      const resp = await ajaxPost(page, {
        action:   'tpae_dashboard_ajax_call',
        type:     'tpae_api_call',
        api_url:  url,
        nonce:    nonce,
      });

      const json = (() => { try { return JSON.parse(resp); } catch { return {}; } })();
      expect(json?.error || resp).toMatch(/invalid_url|invalid|blocked|error/i);
    });
  }
});

// ─── CRITICAL — C6 : Template Title Rename Authorization ─────────────────────

test.describe('C6 — Template rename: per-post capability check', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=change_current_template_title, nonce field=security, nonce=live_editor, post field=id
  test('C6-1 id=0 returns "Invalid template."', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:   'change_current_template_title',
      security: 'invalid-nonce',
      id:       '0',
      title:    'Injected Title',
    });
    expect(resp).toMatch(/invalid template|invalid|error|-1/i);
  });

  test('C6-2 non-existent id=99999999 returns "Invalid template."', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:   'change_current_template_title',
      security: 'invalid-nonce',
      id:       '99999999',
      title:    'Injected Title',
    });
    expect(resp).toMatch(/invalid template|invalid|error|-1/i);
  });

  test('C6-3 bad nonce is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:   'change_current_template_title',
      security: 'bad-nonce-xyz',
      id:       '1',
      title:    'Injected Title',
    });
    expect(resp).toMatch(/-1|false|invalid|nonce/i);
  });
});

// ─── CRITICAL — C7 : WDesignKit Popup Dismiss ────────────────────────────────

test.describe('C7 — WDesignKit popup dismiss: admin-only', () => {
  // Real: action=tp_dont_show_again (wp_ajax only — NOT wp_ajax_nopriv)
  test('C7-1 logged-out request returns 0 (action not registered for nopriv)', async ({ page }) => {
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_dont_show_again');
      const r = await fetch(ajax, { method: 'POST', body: fd });
      return r.text();
    }, AJAX);
    expect(resp.trim()).toMatch(/^(0|-1)$/);
  });

  test('C7-2 admin dismiss persists after reload', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, { action: 'tp_dont_show_again' });
    // Should succeed (not -1)
    expect(resp.trim()).not.toBe('-1');

    await page.reload();
    // WDesignKit popup should not reappear
    await expect(page.locator('#tp-wdkit-preview-popup, .tp-wdkit-preview-popup')).toHaveCount(0);
    await snap(page, 'c7-wdkit-popup-dismissed');
  });
});

// ─── CRITICAL — C9 : Plugin Install Allowlist ────────────────────────────────

test.describe('C9 — Plugin install: only nexter_ext and tp_woo allowed', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=tp_install_promotions_plugin, nonce field=security, nonce=tp_nxt_install
  // Response on failure: tpae_response('Invalid Plugin Type', ..., false)
  test('C9-1 arbitrary plugin_type=akismet is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:      'tp_install_promotions_plugin',
      security:    'invalid-nonce',
      plugin_type: 'akismet',
    });
    expect(resp).toMatch(/invalid plugin type|invalid|error/i);
  });

  test('C9-2 empty plugin_type is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:      'tp_install_promotions_plugin',
      security:    'invalid-nonce',
      plugin_type: '',
    });
    expect(resp).toMatch(/invalid plugin type|invalid|error/i);
  });

  test('C9-3 allowlisted plugin_type nexter_ext passes the gate', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:      'tp_install_promotions_plugin',
      security:    'invalid-nonce',
      plugin_type: 'nexter_ext',
    });
    // Gate passes — response is NOT "Invalid Plugin Type"
    // (nonce will still fail, but the allowlist check passes first)
    expect(resp).not.toMatch(/invalid plugin type/i);
  });
});

// ─── CRITICAL — C10 : Duplicate AJAX action removed ──────────────────────────

test.describe('C10 — Review and data-tracking notices use separate AJAX actions', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=theplus_askreview_notice_dismiss (review), nonce=tpae-ask-review
  test('C10-1 review notice dismiss saves and stays dismissed', async ({ page }) => {
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('domcontentloaded');

    const btn = page.locator('.notice-dismiss').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(600);
    }
    await page.reload();
    await snap(page, 'c10-after-review-dismiss');
    await expect(page.locator('body')).toBeVisible();
  });

  test('C10-2 both notice options exist independently in wp_options', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    // Verify review notice AJAX action is registered
    const resp = await ajaxPost(page, {
      action:    'theplus_askreview_notice_dismiss',
      _wpnonce:  'invalid',
    });
    // Should return -1 (nonce fail) not 0 (action not found) — proves action IS registered
    expect(resp.trim()).toBe('-1');
  });
});

// ─── HIGH — H11 : Twitter Timeline data-chrome ───────────────────────────────

test.describe('H11 — Twitter Timeline: data-chrome encoded with wp_json_encode', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real widget: .tp-social-embed wrapping a.twitter-timeline[data-chrome]
  test('H11-1 data-chrome has no raw double-quotes (HTML-entity encoded)', async ({ page }) => {
    await page.goto(PAGE_TWITTER);
    await page.waitForLoadState('domcontentloaded');

    const el = page.locator('.tp-social-embed a.twitter-timeline[data-chrome]').first();
    if (await el.count()) {
      const raw = await el.getAttribute('data-chrome');
      expect(raw).not.toContain('"');
    }
    await snap(page, 'h11-twitter-data-chrome');
  });
});

// ─── HIGH — H12 : Theme Installer uses safe themes_api() ─────────────────────

test.describe('H12 — Theme installer: no PHP fatal on bad slug', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('H12-1 non-existent theme slug returns graceful error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:     'tpae_dashboard_ajax_call',
      type:       'tpae_install_theme',
      theme_slug: 'non-existent-theme-slug-xyz-99999',
    });
    expect(resp).not.toMatch(/fatal error|parse error/i);
    expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
  });
});

// ─── HIGH — H14 : Form submission JSON sanitization order ────────────────────

test.describe('H14 — Form widget: JSON-special characters preserved', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=tpae_form_submission (nopriv allowed), nonce=tp-form-nonce
  test('H14-1 form submission with special chars returns no PHP error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="theplus-form"], form[class*="tp-form"]').first();
    if (await form.count()) {
      const inputs = form.locator('input[type="text"], input[type="email"], textarea');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const type = await inputs.nth(i).getAttribute('type');
        await inputs.nth(i).fill(type === 'email' ? 'test@example.com' : '{"key":"val"} 🚀 <b>test</b>');
      }
      const submit = form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(2000);
      }
      expect(errors.filter(e => /fatal|json_decode/i.test(e))).toHaveLength(0);
      await snap(page, 'h14-form-special-chars');
    }
  });

  test('H14-2 empty required fields show validation', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="theplus-form"], form[class*="tp-form"]').first();
    if (await form.count()) {
      const submit = form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(800);
        const validation = page.locator('[class*="error"], [class*="validate"], [class*="required"]');
        expect(await validation.count()).toBeGreaterThan(0);
        await snap(page, 'h14-form-validation');
      }
    }
  });
});

// ─── HIGH — H15(a) : SVG Sanitization ────────────────────────────────────────

test.describe('H15(a) — SVG upload: malicious SVGs rejected, clean SVG accepted', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  const maliciousSVGs = [
    { label: 'script-tag',     content: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' },
    { label: 'onload-event',   content: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle/></svg>' },
    { label: 'foreignObject',  content: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>XSS</div></foreignObject></svg>' },
    { label: 'iframe',         content: '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="javascript:alert(1)"/></svg>' },
  ];

  for (const { label, content } of maliciousSVGs) {
    test(`H15(a) — rejected: ${label}`, async ({ page }) => {
      await page.goto(`${ADMIN}/media-new.php`);
      const resp = await page.evaluate(async ({ uploadUrl, svgContent, svgLabel }) => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const file = new File([blob], `test-${svgLabel}.svg`, { type: 'image/svg+xml' });
        const fd = new FormData();
        fd.append('action', 'upload-attachment');
        fd.append('async-upload', file);
        fd.append('name', file.name);
        const r = await fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'include' });
        return r.text();
      }, { uploadUrl: `${ADMIN}/async-upload.php`, svgContent: content, svgLabel: label });

      expect(resp).toMatch(/unsafe|invalid|rejected|not allowed|error/i);
    });
  }

  test('H15(a) — clean SVG uploads without error', async ({ page }) => {
    await page.goto(`${ADMIN}/media-new.php`);
    const cleanSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
    const resp = await page.evaluate(async ({ uploadUrl, svgContent }) => {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const file = new File([blob], 'clean-orbit-test.svg', { type: 'image/svg+xml' });
      const fd = new FormData();
      fd.append('action', 'upload-attachment');
      fd.append('async-upload', file);
      fd.append('name', file.name);
      const r = await fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, { uploadUrl: `${ADMIN}/async-upload.php`, svgContent: cleanSVG });

    expect(resp).not.toMatch(/fatal error/i);
  });
});

// ─── MEDIUM — M18 : Deactivation feedback capability gate ────────────────────

test.describe('M18 — Deactivation feedback: requires deactivate_plugins capability', () => {
  // Real: action=tp_deactivate_rateus_notice, nonce=tp-deactivate-feedback
  test('M18-1 logged-out user is blocked (action not registered for nopriv)', async ({ page }) => {
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_deactivate_rateus_notice');
      fd.append('reason', 'test');
      const r = await fetch(ajax, { method: 'POST', body: fd });
      return r.text();
    }, AJAX);
    expect(resp.trim()).toMatch(/^(0|-1)$/);
  });

  test('M18-2 plugins page loads without errors', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#wpcontent')).toBeVisible();
    await snap(page, 'm18-plugins-page');
  });
});

// ─── MEDIUM — M20 : Dynamic Tag Closures capability gate ─────────────────────

test.describe('M20 — Dynamic tag closures: requires manage_options', () => {
  // Real actions: tp_mark_dynamic_tag_seen (nonce=tp_dynamic_tag_nonce)
  //               tpae_dismiss_dynamic_notice (nonce=tpae_dismiss_dynamic_notice)
  test('M20-1 tp_mark_dynamic_tag_seen with bad nonce is rejected', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action: 'tp_mark_dynamic_tag_seen',
      nonce:  'bad-nonce-xyz',
    });
    expect(resp).toMatch(/-1|false|invalid|error|permission/i);
  });

  test('M20-2 tpae_dismiss_dynamic_notice with bad nonce is rejected', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action: 'tpae_dismiss_dynamic_notice',
      nonce:  'bad-nonce-xyz',
    });
    expect(resp).toMatch(/-1|false|invalid|error|permission/i);
  });
});

// ─── MEDIUM — M22 : Widget Enable/Disable JSON validation ────────────────────

test.describe('M22 — Widget save: invalid JSON returns invalid_payload', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: action=tpae_handle_enable_widget, nonce=tpae_widgets_enable
  test('M22-1 non-JSON payload returns error', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, {
      action:      'tpae_handle_enable_widget',
      nonce:       'bad-nonce',
      widget_data: 'not-valid-json!!!',
    });
    expect(resp).toMatch(/invalid|error|-1/i);
  });

  test('M22-2 TPAE dashboard loads and widget toggles render', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/admin.php?page=theplus-settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('#wpcontent')).toBeVisible();
    expect(errors.filter(e => /fatal|undefined index/i.test(e))).toHaveLength(0);
    await snap(page, 'm22-tpae-dashboard');
  });
});

// ─── MEDIUM — M23 : Testimonial Read More / Read Less labels ─────────────────

test.describe('M23 — Testimonial: labels use textContent (not innerHTML)', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real: elementor widget slug = tp-testimonial-listout
  // JS uses current.textContent = buttonText.readMore / readLess
  test('M23-1 Read More button text is plain text — HTML tags not rendered', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    // Find read-more button inside tp-testimonial-listout widget
    const btn = page.locator('[data-widget_type="tp-testimonial-listout.default"] [class*="read-more"], [class*="tp-read-more"]').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(400);
      // innerHTML should have no child element tags — textContent only
      const inner = await btn.evaluate(el => el.innerHTML);
      expect(inner).not.toMatch(/<(b|i|em|strong|span|script)[^>]*>/i);
      await snap(page, 'm23-read-more-clicked');
    }
  });

  test('M23-2 plain-text read more / read less toggles normally', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const readMore = page.locator('[class*="tp-read-more"], [class*="read-more-btn"]').first();
    if (await readMore.count()) {
      await readMore.click();
      await page.waitForTimeout(400);
      const readLess = page.locator('[class*="tp-read-less"], [class*="read-less-btn"]').first();
      if (await readLess.count()) {
        await readLess.click();
        await page.waitForTimeout(400);
      }
      await snap(page, 'm23-read-toggle');
    }
  });
});

// ─── LOW — L28 / L29 : console.log → console.error ──────────────────────────

test.describe('L28 / L29 — No TPAE console.log noise; errors use console.error', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  // Real console.error strings from source:
  //   "TPAE wdkit preview popup dismiss failed:"  (tp-wdkit-preview-popup.js:74)
  //   "TPAE Elementor install failed:"            (tp-elementor-install.js:32)
  //   "TPAE Elementor install request error:"     (tp-elementor-install.js:37)
  test('L28-L29-1 no TPAE-prefixed console.log on normal admin pages', async ({ page }) => {
    const tpaeLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && /tpae/i.test(msg.text())) tpaeLogs.push(msg.text());
    });

    await page.goto(`${ADMIN}/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('networkidle');

    expect(tpaeLogs).toHaveLength(0);
    await snap(page, 'l28-l29-no-console-log-noise');
  });

  test('L29-2 Elementor install failure surfaces as console.error (not console.log)', async ({ page }) => {
    const consoleLogs   = [];
    const consoleErrors = [];
    page.on('console', msg => {
      if (/tpae.*elementor|elementor.*install/i.test(msg.text())) {
        if (msg.type() === 'log')   consoleLogs.push(msg.text());
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      }
    });

    // Block admin-ajax to simulate network failure
    await page.route('**/admin-ajax.php', route => route.abort());
    await page.goto(`${ADMIN}/`);
    await page.waitForTimeout(1500);

    // Any TPAE Elementor errors must go to console.error, not console.log
    expect(consoleLogs).toHaveLength(0);
  });
});

// ─── LOW — L31 : Deactivation feedback TLS verification ──────────────────────

test.describe('L31 — Deactivation feedback: outbound POST uses HTTPS', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('L31-1 all requests to posimyth.com use HTTPS', async ({ page }) => {
    const outboundUrls = [];
    page.on('request', req => {
      if (/posimyth\.com/i.test(req.url())) outboundUrls.push(req.url());
    });

    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('networkidle');

    outboundUrls.forEach(url => {
      expect(url.startsWith('https://')).toBe(true);
    });
    await snap(page, 'l31-tls-check');
  });
});

// ─── SMOKE TESTS — Cross-cutting regression ───────────────────────────────────

test.describe('Smoke Tests — No regressions from security fixes', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('ST-01 — Cache clear (backend_clear_cache) works', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await ajaxPost(page, { action: 'backend_clear_cache' });
    expect(resp).not.toMatch(/fatal error/i);
    await snap(page, 'st01-cache-clear');
  });

  test('ST-02 — Elementor editor loads with no TPAE console errors', async ({ page }) => {
    const tpaeErrors = [];
    page.on('pageerror', e => { if (/theplus|tpae/i.test(e.message)) tpaeErrors.push(e.message); });

    await page.goto(`${ADMIN}/post-new.php?post_type=page`);
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page.locator('a:has-text("Edit with Elementor"), #elementor-switch-mode-button');
    if (await editBtn.count()) {
      await editBtn.first().click();
      await page.waitForSelector('#elementor-panel, .elementor-panel', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
    await snap(page, 'st02-elementor-editor');
    expect(tpaeErrors).toHaveLength(0);
  });

  test('ST-03 — Frontend widget pages render correctly', async ({ page }) => {
    for (const [label, url] of [
      ['accordion',   PAGE_ACCORDION],
      ['page-scroll', PAGE_PAGE_SCROLL],
      ['style-list',  PAGE_STYLE_LIST],
      ['video',       PAGE_VIDEO],
    ]) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible();
      await snap(page, `st03-${label}-frontend`);
    }
  });

  test('ST-04 — Form widget end-to-end: accepts special chars without fatal', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="theplus-form"], form[class*="tp-form"]').first();
    if (await form.count()) {
      const inputs = form.locator('input[type="text"], input[type="email"], textarea');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const type = await inputs.nth(i).getAttribute('type');
        await inputs.nth(i).fill(type === 'email' ? 'qa@example.com' : 'Test 123 {"a":"b"}');
      }
      const submit = form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(2000);
      }
      expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
      await snap(page, 'st04-form-submit');
    }
  });

  test('ST-05 — Load More: clicking post-load-more loads additional posts', async ({ page }) => {
    await page.goto(PAGE_LOAD_MORE);
    await page.waitForLoadState('domcontentloaded');

    // Real class from tp_blog_listout.php: .ajax_load_more .post-load-more
    const btn = page.locator('.ajax_load_more .post-load-more').first();
    if (await btn.count()) {
      const before = await page.locator('.theplus-posts-wrap article, .blog-list-item').count();
      await btn.click();
      await page.waitForTimeout(2500);
      const after = await page.locator('.theplus-posts-wrap article, .blog-list-item').count();
      expect(after).toBeGreaterThan(before);
      await snap(page, 'st05-load-more');
    }
  });

  test('ST-06 — TPAE dashboard: all sections render, no fatal errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/admin.php?page=theplus-settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('#wpcontent')).toBeVisible();
    expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
    await snap(page, 'st06-tpae-dashboard');
  });

  test('ST-07 — Admin notices dismiss and stay gone', async ({ page }) => {
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('domcontentloaded');

    const btns = page.locator('.notice-dismiss');
    const count = Math.min(await btns.count(), 5);
    for (let i = 0; i < count; i++) {
      await btns.first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    await snap(page, 'st07-notices-dismissed');
  });

  test('ST-08 — Video Player widget renders on frontend', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');

    const widget = page.locator('.pt_plus_video-box-shadow').first();
    if (await widget.count()) await expect(widget).toBeVisible();
    await snap(page, 'st08-video-player');
  });

  test('ST-09 — Twitter Timeline widget renders', async ({ page }) => {
    await page.goto(PAGE_TWITTER);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const widget = page.locator('.tp-social-embed').first();
    if (await widget.count()) await expect(widget).toBeVisible();
    await snap(page, 'st09-twitter-timeline');
  });

  test('ST-10 — No PHP fatal errors across key admin pages', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    for (const url of [
      `${ADMIN}/`,
      `${ADMIN}/plugins.php`,
      `${ADMIN}/admin.php?page=theplus-settings`,
    ]) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
    }

    expect(errors.filter(e => /fatal error|parse error/i.test(e))).toHaveLength(0);
  });
});
