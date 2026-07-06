import { test, expect } from '@playwright/test';

test.describe('Public smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|login|welcome/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('verify seal page renders', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.getByText(/verify/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Detail routes (SSR shell)', () => {
  test('correspondence detail route does not 500', async ({ page }) => {
    const response = await page.goto('/correspondence/00000000-0000-0000-0000-000000000001');
    expect(response?.status()).toBeLessThan(500);
  });

  test('document detail route does not 500', async ({ page }) => {
    const response = await page.goto('/dms/00000000-0000-0000-0000-000000000001');
    expect(response?.status()).toBeLessThan(500);
  });
});
