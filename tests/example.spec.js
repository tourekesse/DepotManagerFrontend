import { test, expect } from '@playwright/test';

test('page d\'accueil se charge', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DepotManager|material-ui-vite/);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input')).toHaveCount(1);
});
