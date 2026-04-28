// TST-SYS-001 through TST-SYS-012 — Playwright system smoke tests.
//
// Run with: npx playwright test
// Requires PLAYWRIGHT_BASE_URL to point at a deployed site (production or
// Netlify deploy preview). Most tests require valid APP_PASSWORD env var.

import { test, expect } from '@playwright/test';

const APP_PASSWORD = process.env.APP_PASSWORD;

test.describe('TST-SYS: cold-launch and auth gate', () => {
  test('TST-SYS-001: cold launch shows password gate (REQ-001)', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    // Auth gate visible. Glucose value still shows placeholder.
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    const glucose = await page.locator('#glucoseVal').textContent();
    expect(glucose?.trim()).toBe('--');
  });

  test('TST-SYS-002: wrong password rejected (REQ-002, REQ-091)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="password"]').fill('definitely-wrong');
    await page.getByRole('button', { name: /unlock|sign in|submit/i }).click();
    // Inline error appears, glucose stays at placeholder.
    await expect(page.locator('#glucoseVal')).toHaveText('--');
  });

  test.skip(!APP_PASSWORD, 'TST-SYS-003 skipped: APP_PASSWORD env not provided');
  test('TST-SYS-003: correct password loads glucose (REQ-002, REQ-010, REQ-020)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="password"]').fill(APP_PASSWORD);
    await page.getByRole('button', { name: /unlock|sign in|submit/i }).click();
    // Glucose value becomes numeric within 10s.
    await expect(page.locator('#glucoseVal')).toHaveText(/^\d+\.\d$/, { timeout: 10_000 });
  });
});

test.describe('TST-SYS: navigation and state', () => {
  test.skip(!APP_PASSWORD, 'auth-gated tests require APP_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="password"]').fill(APP_PASSWORD);
    await page.getByRole('button', { name: /unlock|sign in|submit/i }).click();
    await page.waitForSelector('#glucoseVal:not(:has-text("--"))', { timeout: 10_000 });
  });

  test('TST-SYS-004: tab navigation walks all five screens (REQ-026)', async ({ page }) => {
    for (const screen of ['home', 'health', 'range', 'average', 'dash']) {
      await page.locator(`.tab[data-screen="${screen}"]`).click();
      await expect(page.locator(`#${screen}.screen.active`)).toBeVisible();
    }
  });

  test('TST-SYS-005: time pill switches chart (REQ-026, REQ-041)', async ({ page }) => {
    await page.locator('.tab[data-screen="dash"]').click();
    await page.locator('.pill[data-hours="6"]').click();
    await expect(page.locator('#chartRange')).toHaveText(/6h/);
  });

  test('TST-SYS-006: service worker is registered (REQ-070)', async ({ page }) => {
    const regs = await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then(r => r.length)
    );
    expect(regs).toBeGreaterThan(0);
  });

  test('TST-SYS-007: no plaintext credentials in network traffic (REQ-004, REQ-092)', async ({ page }) => {
    const seen = [];
    page.on('request', (req) => {
      const body = req.postData() || '';
      seen.push(req.url() + '|' + body);
    });
    await page.locator('.tab[data-screen="dash"]').click();
    await page.waitForTimeout(2000);
    const haystack = seen.join('\n');
    expect(haystack).not.toMatch(/Aa123456/);
    expect(haystack).not.toMatch(/daniel\+olivia@biot-med\.com/);
    expect(haystack).not.toMatch(/daniel\+nurse@biot-med\.com/);
  });

  test('TST-SYS-008: localStorage contains no token (REQ-004, REQ-005)', async ({ page }) => {
    const ls = await page.evaluate(() => Object.entries(localStorage));
    for (const [, value] of ls) {
      // No JWT-shaped value; tokens start with eyJ
      expect(value).not.toMatch(/^eyJ[A-Za-z0-9_-]{20,}/);
    }
  });

  test('TST-SYS-009: console contains no token (REQ-094)', async ({ page }) => {
    const messages = [];
    page.on('console', (msg) => messages.push(msg.text()));
    await page.locator('.tab[data-screen="dash"]').click();
    await page.waitForTimeout(2000);
    const haystack = messages.join('\n');
    expect(haystack).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
  });
});
