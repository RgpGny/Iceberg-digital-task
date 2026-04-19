import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test('loads reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Kazanç Raporu')).toBeVisible();
  });

  test('shows filter form', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Filtreler')).toBeVisible();
    await expect(page.getByLabel('Ajan')).toBeVisible();
    await expect(page.getByLabel('Başlangıç Tarihi')).toBeVisible();
    await expect(page.getByLabel('Bitiş Tarihi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Raporu Getir' })).toBeVisible();
  });

  test('nav link leads to reports', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Raporlar' }).click();
    await expect(page).toHaveURL('/reports');
    await expect(page.getByText('Kazanç Raporu')).toBeVisible();
  });
});
