import { test, expect } from '@playwright/test';

test.describe('New Transaction Form', () => {
  test('renders form fields', async ({ page }) => {
    await page.goto('/transactions/new');
    await expect(page.getByText('Yeni İşlem Oluştur')).toBeVisible();
    await expect(page.getByLabel('Adres')).toBeVisible();
    await expect(page.getByLabel('Mülk Türü')).toBeVisible();
    await expect(page.getByLabel('Liste Fiyatı (₺)')).toBeVisible();
    await expect(page.getByLabel('Hizmet Bedeli (₺)')).toBeVisible();
  });

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.goto('/transactions/new');
    await page.getByRole('button', { name: 'İşlem Oluştur' }).click();
    await expect(page.getByText('Adres zorunludur.')).toBeVisible();
  });

  test('back button navigates to dashboard', async ({ page }) => {
    await page.goto('/transactions/new');
    await page.getByRole('button', { name: 'Geri' }).click();
    await expect(page).toHaveURL('/');
  });
});
