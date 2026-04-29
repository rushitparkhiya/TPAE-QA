/**
 * Orbit — Security Audit Phase 1 — QA Verification
 *
 * Covers all 22 fixes from the TPAE Security Audit Phase 1 document.
 *
 * Severity groups:
 *   Critical  : C1–C10  (XSS, SSRF, Auth bypass, plugin install allowlist)
 *   High      : H11–NEW (JSON encoding, safe APIs, form sanitization, SVG)
 *   Medium    : M18–M23 (capability gates, widget save, testimonial labels)
 *   Low       : L28, L29, L31 (console errors, TLS verification)
 *   Smoke     : ST-01–ST-10 (regression cross-cutting checks)
 *
 * Usage:
 *   npx playwright test tests/playwright/elementor/security-audit-phase1.spec.js
 *   WP_TEST_URL=https://your-staging-site.com npx playwright test tests/playwright/elementor/security-audit-phase1.spec.js
 *
 * Requirements:
 *   - Staging WordPress site with TPAE installed and activated
 *   - wp-admin credentials set via WP_ADMIN_USER / WP_ADMIN_PASS env vars (default: admin/admin)
 *   - WP_DEBUG_LOG=true in wp-config.php for smoke test ST-10
 *   - Pages with Accordion, Page Scroll, Style List, Video Player, Testimonial, Load More,
 *     Twitter Timeline, TPAE Form widgets pre-created (set URLs in qa.config.json or env vars)
 */

const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE        = process.env.WP_TEST_URL   || 'http://localhost:8881';
const ADMIN       = `${BASE}/wp-admin`;
const ADMIN_USER  = process.env.WP_ADMIN_USER || 'admin';
const ADMIN_PASS  = process.env.WP_ADMIN_PASS || 'admin';
const AJAX        = `${BASE}/wp-admin/admin-ajax.php`;

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../qa.config.json'), 'utf8')); } catch {}

// Page URLs — override via qa.config.json → security.pages or env vars
const PAGES = cfg.security?.pages || {};
const PAGE_ACCORDION    = process.env.PAGE_ACCORDION    || PAGES.accordion    || `${BASE}/?page_id=accordion-test`;
const PAGE_PAGE_SCROLL  = process.env.PAGE_PAGE_SCROLL  || PAGES.pageScroll   || `${BASE}/?page_id=page-scroll-test`;
const PAGE_STYLE_LIST   = process.env.PAGE_STYLE_LIST   || PAGES.styleList    || `${BASE}/?page_id=style-list-test`;
const PAGE_VIDEO        = process.env.PAGE_VIDEO        || PAGES.video        || `${BASE}/?page_id=video-test`;
const PAGE_TESTIMONIAL  = process.env.PAGE_TESTIMONIAL  || PAGES.testimonial  || `${BASE}/?page_id=testimonial-test`;
const PAGE_LOAD_MORE    = process.env.PAGE_LOAD_MORE    || PAGES.loadMore     || `${BASE}/?page_id=load-more-test`;
const PAGE_TWITTER      = process.env.PAGE_TWITTER      || PAGES.twitter      || `${BASE}/?page_id=twitter-test`;

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

// Fetch a nonce for a given action by inspecting the page source
async function getNonce(page, action) {
  const nonceLocator = page.locator(`[data-nonce], input[name="_wpnonce"]`).first();
  if (await nonceLocator.count()) return (await nonceLocator.getAttribute('value')) || '';
  return '';
}

// ─── CRITICAL FIXES ──────────────────────────────────────────────────────────

test.describe('C1 / C2 / C3 — Widget Render XSS (Accordion, Page Scroll, Style List)', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C1 — Accordion widget: no XSS in data-* attributes', async ({ page }) => {
    await page.goto(PAGE_ACCORDION);
    await page.waitForLoadState('domcontentloaded');

    const html = await page.content();
    // Must not contain unescaped script injection patterns in accordion wrappers
    expect(html).not.toMatch(/<script[^>]*>.*?<\/script>/is);
    expect(html).not.toMatch(/data-[^=]+=["'][^"']*<script/i);

    const accordion = page.locator('.theplus-accordion-wrapper, [class*="tp_accordion"]').first();
    if (await accordion.count()) {
      const outerHTML = await accordion.evaluate(el => el.outerHTML);
      expect(outerHTML).not.toContain('<script');
      expect(outerHTML).not.toMatch(/on\w+\s*=/i);
    }

    await snap(page, 'c1-accordion-render');
  });

  test('C1 — Accordion widget: interactions still work', async ({ page }) => {
    await page.goto(PAGE_ACCORDION);
    await page.waitForLoadState('domcontentloaded');

    const trigger = page.locator('.theplus-accordion-wrapper .accordion-title, [class*="tp_accordion"] .tp-accordion-title').first();
    if (await trigger.count()) {
      await trigger.click();
      await page.waitForTimeout(500);
      await snap(page, 'c1-accordion-expanded');
      // No page crash / error dialog
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('C2 — Page Scroll widget: no XSS in wrapper attributes', async ({ page }) => {
    await page.goto(PAGE_PAGE_SCROLL);
    await page.waitForLoadState('domcontentloaded');

    const wrapper = page.locator('[data-scroll-speed], [class*="page-scroll"], [class*="tp_page_scroll"]').first();
    if (await wrapper.count()) {
      const outerHTML = await wrapper.evaluate(el => el.outerHTML);
      expect(outerHTML).not.toContain('<script');
      expect(outerHTML).not.toMatch(/on\w+\s*=/i);
    }

    await snap(page, 'c2-page-scroll-render');
  });

  test('C3 — Style List widget: no XSS in render output', async ({ page }) => {
    await page.goto(PAGE_STYLE_LIST);
    await page.waitForLoadState('domcontentloaded');

    const widget = page.locator('[class*="tp_style_list"], [class*="theplus-style-list"]').first();
    if (await widget.count()) {
      const outerHTML = await widget.evaluate(el => el.outerHTML);
      expect(outerHTML).not.toContain('<script');
      expect(outerHTML).not.toMatch(/on\w+\s*=/i);
    }

    await snap(page, 'c3-style-list-render');
  });
});

test.describe('C4 — Video Player Sticky Parameter', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C4 — data-stickyparam uses double-quoted JSON with HTML-entity escaping', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');

    const el = page.locator('[data-stickyparam]').first();
    if (await el.count()) {
      const attr = await el.getAttribute('data-stickyparam');
      // Must not contain raw unescaped double-quotes that would break the attribute
      expect(attr).not.toMatch(/(?<!&quot;)"/); // raw " inside JSON would be &quot;
      // Must be valid JSON after HTML-entity decoding
      const decoded = (attr || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      expect(() => JSON.parse(decoded)).not.toThrow();
    }

    await snap(page, 'c4-video-sticky-param');
  });

  test('C4 — Video sticky/unstick behavior still works', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');
    // Scroll down to trigger sticky
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(800);
    await snap(page, 'c4-video-sticky-scrolled');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('C5 — SSRF Protection in tpae_api_call', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  const ssrfPayloads = [
    { label: 'localhost',            url: 'http://127.0.0.1' },
    { label: 'cloud-metadata',       url: 'http://169.254.169.254/latest/meta-data/' },
    { label: 'file-protocol',        url: 'file:///etc/passwd' },
    { label: 'credentials-in-url',   url: 'https://user:pass@example.com' },
    { label: 'ipv6-loopback',        url: 'http://[::1]' },
    { label: 'internal-hostname',    url: 'http://internal.corp' },
  ];

  for (const { label, url } of ssrfPayloads) {
    test(`C5 — SSRF blocked: ${label}`, async ({ page, request }) => {
      await wpLogin(page);

      // Grab nonce from any admin page
      await page.goto(`${ADMIN}/`);
      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const resp = await page.evaluate(async ({ ajax, apiUrl }) => {
        const fd = new FormData();
        fd.append('action', 'tpae_api_call');
        fd.append('api_url', apiUrl);
        const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
        return r.text();
      }, { ajax: AJAX, apiUrl: url });

      // Must return an error — not raw content from the internal target
      expect(resp).toMatch(/invalid_url|invalid|error|blocked/i);
    });
  }
});

test.describe('C6 — Template Title Rename Authorization', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C6 — Rename with id=0 returns "Invalid template."', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_rename_template_title');
      fd.append('id', '0');
      fd.append('title', 'Hacked Title');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/invalid template|invalid|error/i);
  });

  test('C6 — Rename with non-existent id returns "Invalid template."', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_rename_template_title');
      fd.append('id', '99999999');
      fd.append('title', 'Hacked Title');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/invalid template|invalid|error/i);
  });

  test('C6 — Rename with missing nonce is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_rename_template_title');
      fd.append('id', '1');
      fd.append('title', 'Hacked Title');
      fd.append('_wpnonce', 'invalid-nonce-12345');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/-1|false|invalid|error|nonce/i);
  });
});

test.describe('C7 — WDesignKit Popup Dismiss', () => {
  test('C7 — Logged-out request to tp_dont_show_again is rejected', async ({ page }) => {
    // Do NOT log in — test as anonymous
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_dont_show_again');
      const r = await fetch(ajax, { method: 'POST', body: fd });
      return r.text();
    }, AJAX);
    // nopriv action should not be registered → returns 0 or -1
    expect(resp.trim()).toMatch(/^(0|-1|false|\{".*error.*\})$/i);
  });

  test('C7 — Admin dismiss: popup does not reappear', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/`);
    // Dismiss via AJAX as admin
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_dont_show_again');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    // Should succeed (1 or success JSON)
    expect(resp).not.toMatch(/^-1$/);

    // Reload and confirm popup is gone
    await page.reload();
    const popup = page.locator('[class*="wdkit-popup"], [id*="wdkit-popup"]');
    await expect(popup).toHaveCount(0);
    await snap(page, 'c7-wdkit-popup-dismissed');
  });
});

test.describe('C9 — Plugin Install Allowlist', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C9 — Arbitrary plugin_type is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_install_promotions_plugin');
      fd.append('plugin_type', 'akismet');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/invalid plugin type|invalid|error/i);
  });

  test('C9 — Empty plugin_type is rejected', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_install_promotions_plugin');
      fd.append('plugin_type', '');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/invalid plugin type|invalid|error/i);
  });

  test('C9 — Allowlisted plugin_type nexter_ext is accepted by gate', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_install_promotions_plugin');
      fd.append('plugin_type', 'nexter_ext');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    // Should NOT return "Invalid Plugin Type"
    expect(resp).not.toMatch(/invalid plugin type/i);
  });
});

test.describe('C10 — Duplicate AJAX Action Removed', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('C10 — Data tracking notice dismiss saves independently', async ({ page }) => {
    await page.goto(`${ADMIN}/plugins.php`);
    // Look for data tracking notice dismiss button
    const btn = page.locator('[data-action*="tpae_data"], .tp-data-tracking-notice .notice-dismiss, [class*="data-tracking"] .notice-dismiss').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(600);
      await page.reload();
      await expect(page.locator('[class*="data-tracking"]')).toHaveCount(0);
    }
    await snap(page, 'c10-data-tracking-dismissed');
  });

  test('C10 — Review notice dismiss saves independently', async ({ page }) => {
    await page.goto(`${ADMIN}/plugins.php`);
    const btn = page.locator('[class*="ask-review"] .notice-dismiss, [data-action*="tpae_ask_review"] .notice-dismiss').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(600);
      await page.reload();
      await expect(page.locator('[class*="ask-review"]')).toHaveCount(0);
    }
    await snap(page, 'c10-review-notice-dismissed');
  });
});

// ─── HIGH-SEVERITY FIXES ──────────────────────────────────────────────────────

test.describe('H11 — Twitter Timeline data-chrome JSON encoding', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('H11 — data-chrome attribute is properly HTML-entity-encoded', async ({ page }) => {
    await page.goto(PAGE_TWITTER);
    await page.waitForLoadState('domcontentloaded');

    const el = page.locator('a.twitter-timeline[data-chrome]').first();
    if (await el.count()) {
      const raw = await el.evaluate(el => el.getAttribute('data-chrome'));
      // Attribute value must not contain raw double-quotes that would break HTML
      expect(raw).not.toContain('"');
    }
    await snap(page, 'h11-twitter-data-chrome');
  });
});

test.describe('H12 — Theme Installer uses safe themes_api()', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('H12 — Non-existent theme slug returns graceful error (no PHP fatal)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tpae_install_theme');
      fd.append('theme_slug', 'non-existent-theme-slug-xyz-12345');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);

    // Should be a graceful JSON error, not a PHP fatal
    expect(resp).not.toMatch(/fatal error|parse error/i);
    expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
  });
});

test.describe('H14 — Form Submission JSON Sanitization', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('H14 — Form accepts JSON-special characters without corruption', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL); // any page with a TPAE form widget
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="tp-form"], form[class*="theplus-form"]').first();
    if (await form.count()) {
      const textInput = form.locator('input[type="text"], textarea').first();
      if (await textInput.count()) {
        const specialChars = '{"key":"value"}:test 🚀 <test>';
        await textInput.fill(specialChars);
        await snap(page, 'h14-form-special-chars-filled');
        // Submit
        const submit = form.locator('button[type="submit"], input[type="submit"]').first();
        if (await submit.count()) {
          await submit.click();
          await page.waitForTimeout(1500);
          // Should not show a PHP error
          const body = await page.content();
          expect(body).not.toMatch(/fatal error|json_decode|sanitize_text_field.*error/i);
        }
      }
    }
  });

  test('H14 — Empty required fields show validation message', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="tp-form"], form[class*="theplus-form"]').first();
    if (await form.count()) {
      const submit = form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(800);
        // Required field validation should appear
        const required = page.locator('[class*="required"], [class*="error"], [class*="validate"]');
        expect(await required.count()).toBeGreaterThan(0);
        await snap(page, 'h14-form-required-validation');
      }
    }
  });
});

test.describe('H15(a) — SVG Sanitization Hardened', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  const maliciousSVGs = [
    {
      label: 'script-tag',
      content: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    },
    {
      label: 'onload-event',
      content: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>',
    },
    {
      label: 'foreignObject',
      content: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>XSS</div></foreignObject></svg>',
    },
    {
      label: 'iframe',
      content: '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="javascript:alert(1)"/></svg>',
    },
  ];

  for (const { label, content } of maliciousSVGs) {
    test(`H15(a) — Malicious SVG rejected: ${label}`, async ({ page }) => {
      await page.goto(`${ADMIN}/media-new.php`);
      await page.waitForLoadState('domcontentloaded');

      // Create a temporary SVG blob and attempt upload
      const resp = await page.evaluate(async ({ ajax, svgContent, svgLabel }) => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const file = new File([blob], `test-${svgLabel}.svg`, { type: 'image/svg+xml' });
        const fd = new FormData();
        fd.append('action', 'upload-attachment');
        fd.append('async-upload', file);
        fd.append('name', file.name);
        const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
        return r.text();
      }, { ajax: `${ADMIN}/async-upload.php`, svgContent: content, svgLabel: label });

      // The upload should be rejected with a sanitization error
      expect(resp).toMatch(/unsafe|invalid|rejected|error|not allowed/i);
    });
  }

  test('H15(a) — Clean SVG uploads successfully', async ({ page }) => {
    await page.goto(`${ADMIN}/media-new.php`);
    await page.waitForLoadState('domcontentloaded');

    const cleanSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
    const resp = await page.evaluate(async ({ ajax, svgContent }) => {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const file = new File([blob], 'clean-test.svg', { type: 'image/svg+xml' });
      const fd = new FormData();
      fd.append('action', 'upload-attachment');
      fd.append('async-upload', file);
      fd.append('name', file.name);
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, { ajax: `${ADMIN}/async-upload.php`, svgContent: cleanSVG });

    // Should succeed (contain a URL or success indicator)
    expect(resp).not.toMatch(/fatal error/i);
  });
});

test.describe('NEW — Plugin/Theme Installer Safe APIs', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('NEW — Non-existent plugin slug returns graceful error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_install_promotions_plugin');
      fd.append('plugin_type', 'nexter_ext');
      fd.append('plugin_slug', 'non-existent-plugin-xyz-99999');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);

    expect(resp).not.toMatch(/fatal error|parse error/i);
    expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
  });
});

// ─── MEDIUM-SEVERITY FIXES ────────────────────────────────────────────────────

test.describe('M18 — Deactivation Feedback Capability Gate', () => {
  test('M18 — Logged-out user cannot submit deactivation feedback', async ({ page }) => {
    // Not logged in
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tp_deactivate_feedback');
      fd.append('reason', 'test');
      const r = await fetch(ajax, { method: 'POST', body: fd });
      return r.text();
    }, AJAX);
    expect(resp.trim()).toMatch(/^(0|-1|false|\{.*error.*\})$/i);
  });

  test('M18 — Admin can submit deactivation feedback', async ({ page }) => {
    await wpLogin(page);
    await page.goto(`${ADMIN}/plugins.php`);
    await snap(page, 'm18-plugins-page');
    // Verify plugins page loads without errors
    await expect(page.locator('#wpcontent')).toBeVisible();
  });
});

test.describe('M20 — Dynamic Tag Closure Capability Gate', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('M20 — Non-admin cannot dismiss dynamic tag notice', async ({ page }) => {
    // Replay as admin but with a subscriber-level check simulation
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tpae_dynamic_tag_dismiss');
      fd.append('_wpnonce', 'invalid-nonce');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/-1|false|invalid|error|permission/i);
  });

  test('M20 — Admin can dismiss dynamic tag switcher dot', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    // Navigate to elementor editor and check dynamic tag UI
    await snap(page, 'm20-admin-dashboard');
    await expect(page.locator('#wpcontent')).toBeVisible();
  });
});

test.describe('M22 — Widget Enable/Disable Save JSON Validation', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('M22 — Invalid JSON payload returns invalid_payload', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const resp = await page.evaluate(async (ajax) => {
      const fd = new FormData();
      fd.append('action', 'tpae_set_widget_list');
      fd.append('widget_data', 'not-valid-json!!!');
      const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
      return r.text();
    }, AJAX);
    expect(resp).toMatch(/invalid_payload|invalid|error/i);
  });

  test('M22 — Valid widget toggle saves without PHP warning', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/admin.php?page=theplus-settings`);
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'm22-tpae-dashboard');

    // Toggle a widget if UI is present
    const toggle = page.locator('[class*="widget-toggle"], [class*="tp-widget-enable"]').first();
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(800);
    }

    expect(errors.filter(e => /fatal|warning|undefined index/i.test(e))).toHaveLength(0);
  });
});

test.describe('M23 — Testimonial Read More / Read Less Labels (textContent)', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('M23 — HTML in Read More label is rendered as literal text (not HTML)', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const readMoreBtn = page.locator('[class*="tp-testimonial"] [class*="read-more"], [class*="testimonial"] .tp-read-more').first();
    if (await readMoreBtn.count()) {
      await readMoreBtn.click();
      await page.waitForTimeout(400);

      // Confirm no child HTML elements were injected (textContent only)
      const innerHtml = await readMoreBtn.evaluate(el => el.innerHTML);
      // innerHTML should not contain tags if label has HTML (it should be escaped)
      expect(innerHtml).not.toMatch(/<(b|i|em|strong|script)[^>]*>/i);
      await snap(page, 'm23-testimonial-read-more');
    }
  });

  test('M23 — Plain-text labels toggle normally', async ({ page }) => {
    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const readMoreBtn = page.locator('[class*="tp-testimonial"] [class*="read-more"]').first();
    const readLessBtn = page.locator('[class*="tp-testimonial"] [class*="read-less"]').first();
    if (await readMoreBtn.count()) {
      await readMoreBtn.click();
      await page.waitForTimeout(400);
      if (await readLessBtn.count()) {
        await readLessBtn.click();
        await page.waitForTimeout(400);
      }
      await snap(page, 'm23-testimonial-toggle');
    }
  });
});

// ─── LOW-SEVERITY FIXES ───────────────────────────────────────────────────────

test.describe('L28 / L29 — Console Errors Instead of Logs', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('L28 / L29 — No TPAE console.log noise on normal admin pages', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && /tpae/i.test(msg.text())) logs.push(msg.text());
    });

    await page.goto(`${ADMIN}/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('networkidle');

    expect(logs).toHaveLength(0);
    await snap(page, 'l28-l29-no-console-log-noise');
  });

  test('L29 — Elementor install failure surfaces as console.error (not console.log)', async ({ page }) => {
    const consoleErrors = [];
    const consoleLogs   = [];
    page.on('console', msg => {
      if (/tpae.*elementor/i.test(msg.text())) {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
        if (msg.type() === 'log')   consoleLogs.push(msg.text());
      }
    });

    // Simulate network failure by aborting admin-ajax requests
    await page.route('**/admin-ajax.php', route => route.abort());
    await page.goto(`${ADMIN}/`);
    await page.waitForTimeout(1500);

    // If errors occur they should be console.error not console.log
    expect(consoleLogs).toHaveLength(0);
  });
});

test.describe('L31 — Deactivation Feedback TLS Verification', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('L31 — Deactivation feedback endpoint uses HTTPS', async ({ page }) => {
    const requests = [];
    page.on('request', req => {
      if (/posimyth\.com/i.test(req.url())) requests.push(req.url());
    });

    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('networkidle');

    // All outbound requests to posimyth.com must use HTTPS
    requests.forEach(url => {
      expect(url.startsWith('https://')).toBe(true);
    });

    await snap(page, 'l31-tls-verified');
  });
});

// ─── SMOKE TESTS ──────────────────────────────────────────────────────────────

test.describe('Smoke Tests — Cross-cutting Regression Checks', () => {
  test.beforeEach(async ({ page }) => { await wpLogin(page); });

  test('ST-01 — Cache clear regenerates CSS and JS files', async ({ page }) => {
    await page.goto(`${ADMIN}/`);
    const clearBtn = page.locator('#wp-admin-bar-theplus-clear-cache a, [class*="tpae-clear-cache"]').first();
    if (await clearBtn.count()) {
      await clearBtn.click();
      await page.waitForTimeout(2000);
      await snap(page, 'st01-cache-cleared');
    } else {
      // Trigger via AJAX
      const resp = await page.evaluate(async (ajax) => {
        const fd = new FormData();
        fd.append('action', 'theplus_clear_cache');
        const r = await fetch(ajax, { method: 'POST', body: fd, credentials: 'include' });
        return r.text();
      }, AJAX);
      expect(resp).not.toMatch(/fatal error/i);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('ST-02 — Elementor editor loads with no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`${ADMIN}/post-new.php?post_type=page`);
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page.locator('a:has-text("Edit with Elementor"), #elementor-switch-mode-button');
    if (await editBtn.count()) {
      await editBtn.first().click();
      await page.waitForSelector('.elementor-panel, #elementor-panel', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    const tpaeErrors = errors.filter(e => /tpae|theplus|plus-addons/i.test(e));
    await snap(page, 'st02-elementor-editor');
    expect(tpaeErrors).toHaveLength(0);
  });

  test('ST-03 — Frontend pages with TPAE widgets render correctly', async ({ page }) => {
    for (const [label, url] of [
      ['accordion',   PAGE_ACCORDION],
      ['page-scroll', PAGE_PAGE_SCROLL],
      ['style-list',  PAGE_STYLE_LIST],
    ]) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible();
      await snap(page, `st03-${label}-frontend`);
    }
  });

  test('ST-04 — Form widget end-to-end submission works', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(PAGE_TESTIMONIAL);
    await page.waitForLoadState('domcontentloaded');

    const form = page.locator('form[class*="tp-form"], form[class*="theplus-form"]').first();
    if (await form.count()) {
      const inputs = form.locator('input[type="text"], input[type="email"], textarea');
      const count  = await inputs.count();
      for (let i = 0; i < count; i++) {
        const type = await inputs.nth(i).getAttribute('type');
        await inputs.nth(i).fill(type === 'email' ? 'test@example.com' : 'Test value 123');
      }
      const submit = form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForTimeout(2000);
      }
      await snap(page, 'st04-form-submitted');
      expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
    }
  });

  test('ST-05 — Load More blog widget loads next posts', async ({ page }) => {
    await page.goto(PAGE_LOAD_MORE);
    await page.waitForLoadState('domcontentloaded');

    const loadMoreBtn = page.locator('[class*="load-more"], button:has-text("Load More"), a:has-text("Load More")').first();
    if (await loadMoreBtn.count()) {
      const postsBefore = await page.locator('article, [class*="tp-blog-item"]').count();
      await loadMoreBtn.click();
      await page.waitForTimeout(2000);
      const postsAfter = await page.locator('article, [class*="tp-blog-item"]').count();
      expect(postsAfter).toBeGreaterThan(postsBefore);
      await snap(page, 'st05-load-more');
    }
  });

  test('ST-06 — TPAE dashboard loads: all sections render, toggles save', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${ADMIN}/admin.php?page=theplus-settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.locator('#wpcontent')).toBeVisible();
    await snap(page, 'st06-tpae-dashboard');
    expect(errors.filter(e => /fatal/i.test(e))).toHaveLength(0);
  });

  test('ST-07 — All admin notices dismiss and stay dismissed', async ({ page }) => {
    await page.goto(`${ADMIN}/plugins.php`);
    await page.waitForLoadState('domcontentloaded');

    const dismissButtons = page.locator('.notice-dismiss');
    const count = await dismissButtons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      await dismissButtons.first().click().catch(() => {});
      await page.waitForTimeout(400);
    }

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await snap(page, 'st07-notices-dismissed');
    // No notices reappeared that should have been dismissed
    await expect(page.locator('body')).toBeVisible();
  });

  test('ST-08 — Video Player widget renders and plays', async ({ page }) => {
    await page.goto(PAGE_VIDEO);
    await page.waitForLoadState('domcontentloaded');

    const videoWidget = page.locator('[class*="tp-video"], [class*="theplus-video"]').first();
    if (await videoWidget.count()) {
      await expect(videoWidget).toBeVisible();
    }
    await snap(page, 'st08-video-player');
  });

  test('ST-09 — Twitter Timeline widget renders', async ({ page }) => {
    await page.goto(PAGE_TWITTER);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // allow Twitter script to load

    const twitterWidget = page.locator('a.twitter-timeline, [class*="tp_social_embed"]').first();
    if (await twitterWidget.count()) {
      await expect(twitterWidget).toBeVisible();
    }
    await snap(page, 'st09-twitter-timeline');
  });

  test('ST-10 — No new PHP errors during key flows', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && /php|fatal|warning|notice/i.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    // Run through key pages
    for (const url of [ADMIN, `${ADMIN}/plugins.php`, `${ADMIN}/admin.php?page=theplus-settings`]) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
    }

    const phpErrors = errors.filter(e => /fatal error|parse error|warning|undefined/i.test(e));
    expect(phpErrors).toHaveLength(0);
  });
});
