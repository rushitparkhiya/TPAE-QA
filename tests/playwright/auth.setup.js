// Saves WP admin auth cookies so tests don't re-login every run
const { test: setup, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const AUTH_FILE = path.join(__dirname, '../../.auth/wp-admin.json');
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

setup('authenticate as WordPress admin', async ({ page }) => {
  const BASE    = process.env.WP_TEST_URL || 'http://localhost:8881';
  const WP_USER = process.env.WP_ADMIN_USER || 'admin';
  const WP_PASS = process.env.WP_ADMIN_PASS || 'password';

  // ── Step 1: Login ──────────────────────────────────────────────────────────
  await page.goto(BASE + '/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#user_login').fill(WP_USER);
  await page.locator('#user_pass').fill(WP_PASS);
  await page.locator('#wp-submit').click();

  // Wait for any wp-admin page (could land on upgrade.php) — cold PHP can take 90 s
  await page.waitForURL(/wp-admin/, { timeout: 90000 });

  // ── Step 2: Handle DB upgrade prompt if present ────────────────────────────
  for (let i = 0; i < 3; i++) {
    const url = page.url();
    if (url.includes('upgrade.php') && !url.includes('step=')) {
      console.log('[auth] DB upgrade prompt detected — running upgrade...');
      await page.goto(BASE + '/wp-admin/upgrade.php?step=1&backto=%2Fwp-admin%2F',
        { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);
      // Follow "Continue" link if present
      const continueLink = page.locator('a').filter({ hasText: /continue/i }).first();
      if (await continueLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
      // Navigate to wp-admin after upgrade
      await page.goto(BASE + '/wp-admin/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1000);
    } else {
      break;
    }
  }

  // ── Step 3: Re-login if needed (upgrade may have expired session) ──────────
  if (page.url().includes('wp-login.php')) {
    console.log('[auth] Re-login after upgrade...');
    await page.locator('#user_login').fill(WP_USER);
    await page.locator('#user_pass').fill(WP_PASS);
    await page.locator('#wp-submit').click();
    await page.waitForURL(/wp-admin/, { timeout: 90000 });
  }

  // ── Step 4: Confirm we are on wp-admin ────────────────────────────────────
  await expect(page).toHaveURL(/wp-admin/);

  // ── Step 5: Save cookies ───────────────────────────────────────────────────
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[auth] Logged in as ${WP_USER}. Cookies saved to ${AUTH_FILE}`);
});
