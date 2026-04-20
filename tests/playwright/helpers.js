/**
 * Orbit — Playwright test helpers
 *
 * detectErrorPage: Checks if current page shows an environment/setup error.
 * If true, the calling test should skip recording and return early.
 *
 * slowScroll: Scrolls the page slowly so video shows content meaningfully.
 */

/**
 * Patterns that indicate environment setup failure — not UAT results.
 * Never screenshot or assert on these states.
 */
const ERROR_PATTERNS = [
  /sorry, you are not allowed/i,
  /you do not have sufficient permissions/i,
  /wp_die/i,
  /php fatal error/i,
  /parse error/i,
  /call to undefined function/i,
  /access denied/i,
];

/**
 * Returns true if the current page shows an error that means
 * the plugin isn't set up correctly — not a real UAT failure.
 */
async function detectErrorPage(page) {
  try {
    const url   = page.url();
    const title = await page.title().catch(() => '');
    const body  = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

    // Check HTTP-level indicators
    if (url.includes('wp-login.php')) {
      console.warn('[orbit] Page redirected to login — auth cookies may be stale. Re-run auth setup.');
      return true;
    }

    // Check page content for WP error patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.test(body) || pattern.test(title)) {
        console.warn(`[orbit] Error page detected: "${body.slice(0, 100)}..."`);
        console.warn('[orbit] This is a setup problem, not a UAT result. Check PITFALLS.md.');
        return true;
      }
    }

    // Check for very short pages (likely blank/broken)
    if (body.length < 150 && !url.includes('wp-login')) {
      console.warn(`[orbit] Page body too short (${body.length} chars) — plugin may not be configured.`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Scrolls the page slowly from top to bottom and back.
 * Use before screenshots to show full page content in video.
 * @param {import('@playwright/test').Page} page
 * @param {number} steps - number of scroll increments
 */
async function slowScroll(page, steps = 5) {
  const height = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
  if (height <= 0) return;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), (height / steps) * i);
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(250);
}

/**
 * Wait for a selector with a clear timeout message instead of a cryptic error.
 * Use for dynamic/React admin pages where elements take time to appear.
 */
async function waitForReady(page, selector, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    console.warn(`[orbit] Element not found after ${timeout}ms: ${selector}`);
    console.warn('[orbit] This may mean the plugin uses a different DOM structure. Update the selector.');
    return false;
  }
}

/**
 * Count elements after JS has fully rendered the page.
 * Works for React/Vue admin pages where simple .count() returns 0.
 */
async function countElements(page, selector) {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
}

module.exports = { detectErrorPage, slowScroll, waitForReady, countElements };
