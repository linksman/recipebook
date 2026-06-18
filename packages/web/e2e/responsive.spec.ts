import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 800 };

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/recipes');
}

test.describe('Responsive layout', () => {
  test('recipe list grid — no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('recipe list grid — no horizontal overflow on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('ingredients table collapses to card layout on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);

    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');

    // Check table header is hidden on mobile (display:none via CSS)
    const thead = page.locator('table thead');
    if (await thead.count() > 0) {
      const theadVisible = await thead.evaluate((el) => window.getComputedStyle(el).display);
      expect(theadVisible).toBe('none');
    }

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE.width);
  });

  test('ingredients page — no horizontal overflow on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);

    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(DESKTOP.width);
  });
});
