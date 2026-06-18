import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill('admin');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('/recipes');
}

async function createIngredient(page: import('@playwright/test').Page, name: string) {
  await page.goto('/ingredients');
  await page.getByRole('button', { name: /\+ add ingredient/i }).click();
  await page.getByLabel(/name/i).fill(name);
  await page.getByLabel(/unit type/i).selectOption('Grams');
  await page.getByLabel(/calories/i).fill('100');
  await page.getByLabel(/carbs/i).fill('10');
  await page.getByLabel(/fat/i).fill('2');
  await page.getByLabel(/protein/i).fill('5');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible();
}

test.describe('Recipe management', () => {
  test('create a recipe with two line items → appears in list', async ({ page }) => {
    await login(page);

    const ingName = `E2EIng_${Date.now()}`;
    await createIngredient(page, ingName);

    await page.goto('/recipes/new');

    await page.getByLabel(/title/i).fill('My E2E Recipe');
    await page.getByLabel(/description/i).fill('A test recipe');

    // Add ingredient twice
    await page.getByRole('button', { name: /add ingredient/i }).click();
    await page.locator('select').first().selectOption({ label: ingName });
    await page.getByLabel(/amount 1/i).fill('100');
    await page.getByLabel(/stage note 1/i).fill('First use');

    await page.getByRole('button', { name: /add ingredient/i }).click();
    await page.locator('select').nth(1).selectOption({ label: ingName });
    await page.getByLabel(/amount 2/i).fill('50');
    await page.getByLabel(/stage note 2/i).fill('Second use');

    // Add step
    await page.getByRole('button', { name: /add step/i }).click();
    await page.getByLabel(/step 1/i).fill('Mix all ingredients');

    await page.getByRole('button', { name: /save recipe/i }).click();

    // Should navigate to the recipe detail
    await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { name: 'My E2E Recipe' })).toBeVisible();
  });

  test('edit a recipe title → updated title shown', async ({ page }) => {
    await login(page);
    await page.goto('/recipes/new');

    await page.getByLabel(/title/i).fill('Original Title');
    await page.getByRole('button', { name: /save recipe/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9-]+$/);

    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/edit$/);

    await page.getByLabel(/title/i).fill('Updated Title');
    await page.getByRole('button', { name: /save recipe/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9-]+$/);

    await expect(page.getByRole('heading', { name: 'Updated Title' })).toBeVisible();
  });

  test('delete a recipe → removed from list', async ({ page }) => {
    await login(page);
    await page.goto('/recipes/new');

    const title = `DeleteMe_${Date.now()}`;
    await page.getByLabel(/title/i).fill(title);
    await page.getByRole('button', { name: /save recipe/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9-]+$/);

    await page.goto('/recipes');
    await expect(page.getByText(title)).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /delete/i }).first().click();

    await expect(page.getByText(title)).not.toBeVisible();
  });
});
