import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill('admin');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('/recipes');
}

test.describe('Ingredients page', () => {
  test('login → navigate to ingredients → create → appears in table', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /ingredients/i }).click();
    await page.waitForURL('/ingredients');

    await page.getByRole('button', { name: /\+ add ingredient/i }).click();

    const uniqueName = `TestIng_${Date.now()}`;
    await page.getByLabel(/name/i).fill(uniqueName);
    await page.getByLabel(/unit type/i).selectOption('Grams');
    await page.getByLabel(/calories/i).fill('100');
    await page.getByLabel(/carbs/i).fill('20');
    await page.getByLabel(/fat/i).fill('2');
    await page.getByLabel(/protein/i).fill('5');
    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByRole('cell', { name: uniqueName })).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await login(page);
    await page.goto('/ingredients');
    await page.getByRole('button', { name: /\+ add ingredient/i }).click();
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test('unauthenticated visit to /ingredients redirects to /login', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page).toHaveURL('/login');
  });
});
