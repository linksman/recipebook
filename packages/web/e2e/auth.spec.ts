import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('valid login navigates to /recipes', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/recipes');
  });

  test('wrong password shows error alert', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('unauthenticated visit to /recipes redirects to /login', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page).toHaveURL('/login');
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/recipes');
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL('/login');
    await page.goto('/recipes');
    await expect(page).toHaveURL('/login');
  });
});
