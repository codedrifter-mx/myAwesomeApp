import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows Sign In and Create Account buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /start for free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
  });

  test('Sign In link points to Keycloak', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /log in/i }).first();
    const href = await loginLink.getAttribute('href');
    expect(href).toContain('openid-connect/auth');
    expect(href).toContain('myawesomeapp-frontend');
  });
});
