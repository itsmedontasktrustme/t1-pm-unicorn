// @ts-check
import { test, expect } from '@playwright/test';

test('Overview is displayed on opening', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();

  await expect(page.getByText('This is a placeholder for the home overview page.')).toBeVisible();
});

test('Tasks button opens Tasks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

  await expect(page.getByText('This is a placeholder for the task management page.')).toBeVisible();
});

test('Overview button returns to Overview', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Overview', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});
