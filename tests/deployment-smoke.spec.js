// @ts-check
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appUrl = 'https://t1-pm-unicorn.cloud/';
const googleUrl = /^https:\/\/accounts\.google\.com\//;
const counterFile = resolve('.homekeeper-smoke-counter');
const nextButton = /^(Další|Next|Далее)$/iu;
const continueButton = /^(Pokračovat|Continue|Продолжить)$/iu;

test.use({
  storageState: { cookies: [], origins: [] },
  trace: 'off',
  screenshot: 'off',
  video: 'off',
});

test('HomeKeeper deployment smoke check', async ({ page }) => {
  test.setTimeout(120_000);

  const email = process.env.HOMEKEEPER_GOOGLE_EMAIL;
  const password = process.env.HOMEKEEPER_GOOGLE_PASSWORD;

  if (!email || !password) {
    throw new Error('Set HOMEKEEPER_GOOGLE_EMAIL and HOMEKEEPER_GOOGLE_PASSWORD.');
  }

  await test.step('1. Open the signed-out HomeKeeper landing page', async () => {
    await page.goto(appUrl);
    await expect(
      page.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
  });

  const emailField = page.getByRole('textbox', {
    name: 'Email or phone',
    exact: true,
  });

  await test.step('2. Open Google sign-in', async () => {
    await page
      .getByRole('button', {
        name: 'Continue with Google',
        exact: true,
      })
      .click();

    await expect(page).toHaveURL(googleUrl, { timeout: 20_000 });
    await expect(emailField).toBeVisible({ timeout: 15_000 });
  });

  await test.step('3. Enter the email and click Next', async () => {
    await emailField.fill(email);
    await expect(emailField).toHaveValue(email);
    await page.getByRole('button', { name: nextButton }).click();
  });

  await test.step('4. Enter the password and continue', async () => {
    const passwordField = page.locator('input[type="password"]:visible');
    await expect(passwordField).toBeVisible({ timeout: 20_000 });
    await passwordField.fill(password);
    await page.getByRole('button', { name: nextButton }).click();
  });

  const accountReady = page.getByText('Your account is ready', { exact: true });
  const createHousehold = page.getByRole('button', {
    name: /^Create (?:a |new )?household\b/i,
  });
  const clerkConsent = page.getByRole('heading', { name: /Clerk/i });

  await test.step('5. Confirm Clerk consent if shown and return to HomeKeeper', async () => {
    await expect(clerkConsent.or(accountReady).or(createHousehold).first()).toBeVisible({
      timeout: 30_000,
    });

    if (googleUrl.test(page.url()) && (await clerkConsent.isVisible())) {
      await page.getByRole('button', { name: continueButton }).click();
    }

    await expect(page).toHaveURL(/^https:\/\/t1-pm-unicorn\.cloud(?:\/|$)/, {
      timeout: 30_000,
    });

    if (await accountReady.isVisible()) {
      await expect(accountReady).toBeVisible();
    }

    await expect(createHousehold.first()).toBeVisible();
  });

  const nameField = page.getByLabel(/Household name/i);

  await test.step('6. Open the household creation form', async () => {
    await createHousehold.first().click();
    await expect(nameField).toBeVisible();
  });

  const runNumber = existsSync(counterFile) ? Number(readFileSync(counterFile, 'utf8').trim()) : 0;

  if (!Number.isSafeInteger(runNumber) || runNumber < 0) {
    throw new Error('Invalid household number in .homekeeper-smoke-counter.');
  }

  const household = runNumber === 0 ? 'Flat Vinohrady' : `Flat Vinohrady${runNumber}`;
  const dashboard = page.getByRole('heading', { name: household, exact: true });
  const owner = page.getByText('Owner', { exact: true }).first();
  const manager = page.getByText('Manager', { exact: true }).first();

  await test.step(`7. Create ${household} and verify the dashboard`, async () => {
    await nameField.fill(household);

    // Reserve the name before submitting in case a later check fails.
    writeFileSync(counterFile, `${runNumber + 1}\n`, 'utf8');
    await page.getByRole('button', { name: 'Create household', exact: true }).click();

    await expect(dashboard).toBeVisible();
    await expect(owner).toBeVisible();
    await expect(manager).toBeVisible();
  });

  await test.step('8. Reload and verify the household and both roles', async () => {
    await page.reload();
    await expect(dashboard).toBeVisible();
    await expect(owner).toBeVisible();
    await expect(manager).toBeVisible();
  });
});
