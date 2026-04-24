// Saves WP admin auth cookies so tests don't re-login every run
const { test: setup, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const AUTH_FILE = path.join(__dirname, '../../.auth/wp-admin.json');
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

setup('authenticate as WordPress admin', async ({ page }) => {
  const WP_USER = process.env.WP_ADMIN_USER || 'admin';
  const WP_PASS = process.env.WP_ADMIN_PASS || 'password';

  // Visit login page to get the test cookie set
  await page.goto('/wp-login.php');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Use #user_login and #user_pass selectors (more reliable than label/role)
  await page.locator('#user_login').fill(WP_USER);
  await page.locator('#user_pass').fill(WP_PASS);

  // Submit via the button or form
  await page.locator('#wp-submit').click();

  // Wait for redirect to wp-admin (up to 15s)
  try {
    await page.waitForURL(/wp-admin/, { timeout: 15000 });
  } catch {
    // If still on login page, try submitting again
    const currentUrl = page.url();
    if (currentUrl.includes('wp-login.php')) {
      // Try programmatic form submission as fallback
      await page.evaluate(({ user, pass }) => {
        document.querySelector('#user_login').value = user;
        document.querySelector('#user_pass').value = pass;
        document.querySelector('#loginform').submit();
      }, { user: WP_USER, pass: WP_PASS });
      await page.waitForURL(/wp-admin/, { timeout: 15000 });
    }
  }

  await expect(page).toHaveURL(/wp-admin/);
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[auth] Logged in as ${WP_USER}. Cookies saved to ${AUTH_FILE}`);
});
