import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Iceberg Transactions')).toBeVisible();
    await expect(page.getByText('Gayrimenkul İşlemleri')).toBeVisible();
  });

  test('shows nav links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'İşlemler' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Raporlar' })).toBeVisible();
  });

  test('new transaction button navigates to /transactions/new', async ({ page }) => {
    await page.goto('/');
    // Click the nav bar "+ Yeni İşlem" button
    await page.locator('header').getByText('Yeni İşlem').click();
    await expect(page).toHaveURL('/transactions/new');
  });

  test('shows stage filter buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Tümü' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anlaşma' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kapora' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tapu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tamamlandı' })).toBeVisible();
  });
});
