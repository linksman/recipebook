import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/recipes');
}

async function createIngredient(page: Page, name: string, cals = '4') {
  await page.goto('/ingredients');
  await page.click('button:has-text("+ Add Ingredient")');
  // Modal appears
  await page.waitForSelector('[role="dialog"]');
  await page.fill('#ing-name', name);
  await page.selectOption('#ing-unit', 'Grams');
  await page.fill('#ing-caloriesPerUnit', cals);
  await page.fill('#ing-carbsPerUnit', '0');
  await page.fill('#ing-fatPerUnit', '0');
  await page.fill('#ing-proteinPerUnit', '0');
  await page.click('button[type="submit"]:has-text("Save")');
  // Modal should close and ingredient should appear in table
  await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  await page.waitForSelector(`text=${name}`);
}

async function deleteIngredientFromList(page: Page, name: string) {
  await page.goto('/ingredients');
  await page.waitForLoadState('networkidle');
  const row = page.locator('tr', { has: page.locator(`text="${name}"`) });
  await row.locator('button:has-text("Delete")').click();
  await page.waitForSelector(`text=${name}`, { state: 'hidden' });
}

test.describe('Journey A — create recipe with repeated ingredient, verify nutrition, edit, delete', () => {
  const ING_NAME = 'E2E-JourneyA-Flour';
  const RECIPE_TITLE = 'Journey A Pancakes';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await createIngredient(page, ING_NAME, '4');
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) })
      .locator('button:has-text("Delete")');
    if (await deleteBtn.count() > 0 && await deleteBtn.isEnabled()) {
      await deleteBtn.click();
    }
    await page.close();
  });

  test('create recipe with same ingredient twice via modal', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    // Open new recipe modal
    await page.click('button:has-text("+ New Recipe")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('#recipe-title', RECIPE_TITLE);

    // Add first ingredient line
    await page.click('button:has-text("+ Add ingredient")');
    await page.selectOption('select[aria-label="Ingredient 1"]', { label: ING_NAME });
    await page.fill('input[aria-label="Amount 1"]', '100');

    // Add second ingredient line
    await page.click('button:has-text("+ Add ingredient")');
    await page.selectOption('select[aria-label="Ingredient 2"]', { label: ING_NAME });
    await page.fill('input[aria-label="Amount 2"]', '50');

    // Nutrition panel should show 150g * 4 kcal/g = 600 kcal
    const panel = page.locator('[aria-label="Nutrition summary"]');
    await expect(panel).toContainText('600');

    // Add a step and save
    await page.click('button:has-text("+ Add step")');
    await page.fill('input[aria-label="Step 1"]', 'Mix everything together');
    await page.click('button[type="submit"]:has-text("Save Recipe")');

    // After save, modal closes and we navigate to the recipe detail
    await page.waitForURL(/\/recipes\/[^/]+$/);
    await expect(page.locator('h1')).toContainText(RECIPE_TITLE);
  });

  test('recipe view shows nutrition panel with correct totals', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.click(`text=${RECIPE_TITLE}`);
    await page.waitForURL(/\/recipes\/[^/]+$/);

    const panel = page.locator('[aria-label="Nutrition summary"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('600');
  });

  test('edit recipe title via modal', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.click(`text=${RECIPE_TITLE}`);
    await page.waitForURL(/\/recipes\/[^/]+$/);

    // Click the Edit button to open modal
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('#recipe-title', `${RECIPE_TITLE} v2`);
    await page.click('button[type="submit"]:has-text("Save Recipe")');

    // Modal closes, detail view updates in place
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    await expect(page.locator('h1')).toContainText(`${RECIPE_TITLE} v2`);
  });

  test('delete recipe from list', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[class*="card"]', { hasText: `${RECIPE_TITLE} v2` })
      .locator('button:has-text("✕")').click();
    await page.waitForSelector(`text=${RECIPE_TITLE} v2`, { state: 'hidden' });
  });
});

test.describe('Journey B — ingredient lock enforcement', () => {
  const ING_NAME = 'E2E-JourneyB-Almond';
  const RECIPE_TITLE = 'Journey B Cake';

  test('full ingredient lock lifecycle', async ({ page }) => {
    await login(page);

    // 1. Create ingredient via modal
    await createIngredient(page, ING_NAME, '6');

    // 2. Create recipe using that ingredient via modal
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("+ New Recipe")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('#recipe-title', RECIPE_TITLE);
    await page.click('button:has-text("+ Add ingredient")');
    await page.selectOption('select[aria-label="Ingredient 1"]', { label: ING_NAME });
    await page.fill('input[aria-label="Amount 1"]', '80');
    await page.click('button[type="submit"]:has-text("Save Recipe")');
    await page.waitForURL(/\/recipes\/[^/]+$/);

    // 3. Navigate to ingredients — Delete button should be disabled (ingredient is locked)
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) });
    await expect(row.locator('button:has-text("Delete")')).toBeDisabled();

    // 4. Navigate back to recipes, delete the recipe
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[class*="card"]', { hasText: RECIPE_TITLE })
      .locator('button:has-text("✕")').click();
    await page.waitForSelector(`text=${RECIPE_TITLE}`, { state: 'hidden' });

    // 5. Navigate back to ingredients — Delete should now be enabled
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const row2 = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) });
    await expect(row2.locator('button:has-text("Delete")')).toBeEnabled();

    // 6. Delete the ingredient
    await row2.locator('button:has-text("Delete")').click();
    await page.waitForSelector(`text=${ING_NAME}`, { state: 'hidden' });
  });
});
