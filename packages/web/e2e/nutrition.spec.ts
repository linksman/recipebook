import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill('admin');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL('/recipes');
}

async function createIngredientWithNutrition(
  page: import('@playwright/test').Page,
  name: string,
  calories: string
) {
  await page.goto('/ingredients');
  await page.getByRole('button', { name: /\+ add ingredient/i }).click();
  await page.getByLabel(/name/i).fill(name);
  await page.getByLabel(/unit type/i).selectOption('Grams');
  await page.getByLabel(/calories/i).fill(calories);
  await page.getByLabel(/carbs/i).fill('1');
  await page.getByLabel(/fat/i).fill('0');
  await page.getByLabel(/protein/i).fill('0');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible();
}

test.describe('Nutrition Panel', () => {
  test('recipe view shows correct calorie total', async ({ page }) => {
    await login(page);

    const ingName = `NutIng_${Date.now()}`;
    await createIngredientWithNutrition(page, ingName, '2'); // 2 cal/gram

    // Create a recipe with 100g of that ingredient → expect 200 cal
    await page.goto('/recipes/new');
    await page.getByLabel(/title/i).fill('Nutrition Test Recipe');
    await page.getByRole('button', { name: /add ingredient/i }).click();
    await page.locator('select').first().selectOption({ label: ingName });
    await page.getByLabel(/amount 1/i).fill('100');
    await page.getByRole('button', { name: /save recipe/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9-]+$/);

    // View mode should show the nutrition panel
    await expect(page.getByText(/total for entire recipe/i)).toBeVisible();
    await expect(page.getByText('200.0')).toBeVisible(); // 100g × 2 cal/g
  });

  test('nutrition panel updates immediately in edit mode when amount changes', async ({ page }) => {
    await login(page);

    const ingName = `NutIng2_${Date.now()}`;
    await createIngredientWithNutrition(page, ingName, '5'); // 5 cal/gram

    // Create recipe
    await page.goto('/recipes/new');
    await page.getByLabel(/title/i).fill('Live Update Test');
    await page.getByRole('button', { name: /save recipe/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9-]+$/);

    // Open edit mode
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(/\/edit$/);

    // Add ingredient
    await page.getByRole('button', { name: /add ingredient/i }).click();
    await page.locator('select').first().selectOption({ label: ingName });

    const amountInput = page.getByLabel(/amount 1/i);
    await amountInput.fill('50'); // 50 × 5 = 250 cal

    // No save needed — panel updates on each keystroke
    await expect(page.getByText('250.0')).toBeVisible();

    // Change amount to 100 → 500 cal
    await amountInput.fill('100');
    await expect(page.getByText('500.0')).toBeVisible();
  });
});
