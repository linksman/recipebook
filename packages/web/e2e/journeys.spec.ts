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
  await page.fill('#ing-name', name);
  await page.selectOption('#ing-unit', 'Grams');
  await page.fill('#ing-caloriesPerUnit', cals);
  await page.fill('#ing-carbsPerUnit', '0');
  await page.fill('#ing-fatPerUnit', '0');
  await page.fill('#ing-proteinPerUnit', '0');
  await page.click('button[type="submit"]:has-text("Save")');
  // form dismisses, ingredient now visible in list
  await page.waitForSelector(`text=${name}`);
}

async function deleteIngredientFromList(page: Page, name: string) {
  await page.goto('/ingredients');
  await page.waitForLoadState('networkidle');
  // Find the row containing the ingredient name and click its Delete button
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
    // clean up ingredient if it wasn't deleted by the test
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) }).locator('button:has-text("Delete")');
    if (await deleteBtn.count() > 0 && await deleteBtn.isEnabled()) {
      await deleteBtn.click();
    }
    await page.close();
  });

  test('create recipe with same ingredient twice', async ({ page }) => {
    await login(page);
    await page.goto('/recipes/new');
    await page.waitForLoadState('networkidle');

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

    // Should redirect to recipe view
    await page.waitForURL(/\/recipes\/[^/]+$/);
    await expect(page.locator('h1')).toContainText(RECIPE_TITLE);
  });

  test('recipe view shows nutrition panel with correct totals', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    // Find and click the recipe card
    await page.click(`text=${RECIPE_TITLE}`);
    await page.waitForURL(/\/recipes\/[^/]+$/);

    const panel = page.locator('[aria-label="Nutrition summary"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('600');
  });

  test('edit recipe title', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.click(`text=${RECIPE_TITLE}`);
    await page.waitForURL(/\/recipes\/[^/]+$/);

    await page.click('a:has-text("Edit")');
    await page.waitForURL(/\/edit$/);

    await page.fill('#recipe-title', `${RECIPE_TITLE} v2`);
    await page.click('button[type="submit"]:has-text("Save Recipe")');

    await page.waitForURL(/\/recipes\/[^/]+$/);
    await expect(page.locator('h1')).toContainText(`${RECIPE_TITLE} v2`);
  });

  test('delete recipe from list', async ({ page }) => {
    await login(page);
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    page.on('dialog', (dialog) => dialog.accept());
    const recipeCard = page.locator('.card', { hasText: `${RECIPE_TITLE} v2` });
    // In case CSS class name is hashed, fall back to link containing the text
    const deleteBtn = page.locator('a, div', { hasText: `${RECIPE_TITLE} v2` }).first()
      .locator('xpath=ancestor::a').locator('..').locator('button:has-text("Delete")');

    // Alternative: just find any Delete button near that recipe title
    await page.locator('[class*="card"]', { hasText: `${RECIPE_TITLE} v2` }).locator('button:has-text("Delete")').click();
    await page.waitForSelector(`text=${RECIPE_TITLE} v2`, { state: 'hidden' });
  });
});

test.describe('Journey B — ingredient lock enforcement', () => {
  const ING_NAME = 'E2E-JourneyB-Almond';
  const RECIPE_TITLE = 'Journey B Cake';

  test('full ingredient lock lifecycle', async ({ page }) => {
    await login(page);

    // 1. Create ingredient
    await createIngredient(page, ING_NAME, '6');

    // 2. Create recipe using that ingredient
    await page.goto('/recipes/new');
    await page.waitForLoadState('networkidle');
    await page.fill('#recipe-title', RECIPE_TITLE);
    await page.click('button:has-text("+ Add ingredient")');
    await page.selectOption('select[aria-label="Ingredient 1"]', { label: ING_NAME });
    await page.fill('input[aria-label="Amount 1"]', '80');
    await page.click('button[type="submit"]:has-text("Save Recipe")');
    await page.waitForURL(/\/recipes\/[^/]+$/);

    // 3. Navigate to ingredients — Delete button for this ingredient should be disabled
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) });
    const deleteBtn = row.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeDisabled();

    // 4. Navigate back to recipes, delete the recipe
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[class*="card"]', { hasText: RECIPE_TITLE }).locator('button:has-text("Delete")').click();
    await page.waitForSelector(`text=${RECIPE_TITLE}`, { state: 'hidden' });

    // 5. Navigate back to ingredients — Delete button should now be enabled
    await page.goto('/ingredients');
    await page.waitForLoadState('networkidle');
    const row2 = page.locator('tr', { has: page.locator(`text="${ING_NAME}"`) });
    const deleteBtn2 = row2.locator('button:has-text("Delete")');
    await expect(deleteBtn2).toBeEnabled();

    // 6. Delete the ingredient
    await deleteBtn2.click();
    await page.waitForSelector(`text=${ING_NAME}`, { state: 'hidden' });
  });
});
