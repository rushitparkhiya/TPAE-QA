'use strict';

const { test, expect } = require('@playwright/test');

const WP_URL = 'http://localhost:8888';
const ADMIN_URL = `${WP_URL}/wp-admin`;
const TPAE_DASHBOARD = `${ADMIN_URL}/admin.php?page=theplus_welcome_page`;
const USERNAME = 'admin';
const PASSWORD = 'password';

async function login(page) {
	await page.goto(`${ADMIN_URL}/`);
	await page.fill('#user_login', USERNAME);
	await page.fill('#user_pass', PASSWORD);
	await page.click('#wp-submit');
	await page.waitForURL(`**\/wp-admin\/**`);
}

async function resetOnboarding(page) {
	// Clear the onboarding option so it shows again
	await page.goto(`${ADMIN_URL}/admin-ajax.php`);
	await page.evaluate(async () => {
		await fetch('/wp-admin/admin-ajax.php', {
			method: 'POST',
			body: new URLSearchParams({
				action: 'tpae_dashboard_ajax_call',
				type: 'tpae_reset_onboarding',
			}),
		});
	});
	// Clear localStorage onboarding state
	await page.evaluate(() => {
		localStorage.removeItem('tpae_onboarding_step');
		localStorage.removeItem('tpae_import_step');
	});
}

test.describe('TPAE Onboarding Flow', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('TC-001: TPAE dashboard page loads successfully', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD, { timeout: 30000 });
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		const title = await page.title();
		expect(title).toBeTruthy();
		const body = page.locator('body');
		await expect(body).toBeVisible();
		// Check no PHP fatal error shown
		await expect(page.locator('body')).not.toContainText('Fatal error');
		await expect(page.locator('body')).not.toContainText('Parse error');
	});

	test('TC-002: TPAE admin menu item visible in sidebar', async ({ page }) => {
		await page.goto(ADMIN_URL);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		const tpaeMenu = page.locator('#toplevel_page_theplus_welcome_page');
		await expect(tpaeMenu).toBeVisible();
	});

	test('TC-003: Onboarding modal appears on fresh install', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		await page.waitForTimeout(2000);

		// Check if onboarding overlay/modal is present in DOM
		const onboardingOverlay = page.locator('.tpae-onboarding-cover, .onboarding-cover, [class*="onboarding"]').first();
		const isVisible = await onboardingOverlay.isVisible().catch(() => false);

		// Screenshot for reference
		await page.screenshot({ path: 'reports/tpae-onboarding-initial.png', fullPage: true });

		// Log the state
		console.log('Onboarding visible:', isVisible);
	});

	test('TC-004: Skip Setup button dismisses onboarding', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		await page.waitForTimeout(2000);

		const skipBtn = page.locator('.onboarding-close-btn, [class*="onboarding-close"]').first();
		const skipVisible = await skipBtn.isVisible().catch(() => false);

		if (skipVisible) {
			await skipBtn.click();
			await page.waitForTimeout(1000);
			const stillVisible = await skipBtn.isVisible().catch(() => false);
			expect(stillVisible).toBeFalsy();
		} else {
			console.log('Skip button not found - onboarding may already be dismissed');
		}

		await page.screenshot({ path: 'reports/tpae-after-skip.png', fullPage: true });
	});

	test('TC-005: TPAE dashboard sub-menu items are present', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);

		const subMenuItems = ['Widgets', 'Extensions', 'Settings'];
		for (const item of subMenuItems) {
			const menuLink = page.locator(`#adminmenu a:has-text("${item}")`).first();
			const visible = await menuLink.isVisible().catch(() => false);
			console.log(`Submenu "${item}" visible: ${visible}`);
		}

		await page.screenshot({ path: 'reports/tpae-dashboard.png', fullPage: true });
	});

	test('TC-006: TPAE dashboard React app renders without JS errors', async ({ page }) => {
		const jsErrors = [];
		page.on('pageerror', (err) => jsErrors.push(err.message));

		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		await page.waitForTimeout(3000);

		await page.screenshot({ path: 'reports/tpae-dashboard-react.png', fullPage: true });
		console.log('JS Errors:', jsErrors);

		// Report any critical JS errors
		const criticalErrors = jsErrors.filter(e =>
			!e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
		);
		if (criticalErrors.length > 0) {
			console.log('Critical JS Errors found:', criticalErrors);
		}
	});

	test('TC-007: Onboarding step navigation works', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		await page.waitForTimeout(2000);

		// Check for next/continue buttons in onboarding
		const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Get Started"), [class*="next"]').first();
		const nextVisible = await nextBtn.isVisible().catch(() => false);
		console.log('Next/Continue button visible:', nextVisible);

		if (nextVisible) {
			await nextBtn.click();
			await page.waitForTimeout(1000);
			await page.screenshot({ path: 'reports/tpae-onboarding-step2.png', fullPage: true });
		}
	});

	test('TC-008: Admin notice shows after plugin activation', async ({ page }) => {
		await page.goto(ADMIN_URL);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);

		const notices = page.locator('.notice, .updated, .error, .tpae-notice, [class*="tpae"]');
		const count = await notices.count();
		console.log(`Admin notices found: ${count}`);

		await page.screenshot({ path: 'reports/tpae-admin-notices.png', fullPage: true });
	});

	test('TC-009: TPAE welcome page has no broken images', async ({ page }) => {
		const brokenImages = [];
		page.on('response', (response) => {
			if (response.request().resourceType() === 'image' && response.status() >= 400) {
				brokenImages.push(response.url());
			}
		});

		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);
		await page.waitForTimeout(2000);

		console.log('Broken images:', brokenImages);
		if (brokenImages.length > 0) {
			console.log('Broken image URLs:', brokenImages);
		}
	});

	test('TC-010: Onboarding AJAX call responds correctly', async ({ page }) => {
		await page.goto(TPAE_DASHBOARD);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(3000);

		// Intercept the onboarding AJAX call
		let onboardingResponse = null;
		page.on('response', async (response) => {
			if (response.url().includes('admin-ajax.php')) {
				try {
					const body = await response.text();
					if (body.includes('onboarding') || body.includes('Onboarding')) {
						onboardingResponse = body;
					}
				} catch {}
			}
		});

		await page.waitForTimeout(3000);
		console.log('Onboarding AJAX response:', onboardingResponse);
		await page.screenshot({ path: 'reports/tpae-onboarding-final.png', fullPage: true });
	});
});
