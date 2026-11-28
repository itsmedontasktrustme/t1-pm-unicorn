const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("@playwright/test");

Given("the following constants:", function (dataTable) {
  for (const row of dataTable.hashes()) {
    this.constants.set(row.name.trim(), row.value.trim());
  }
});

When("reloads the page", async function () {
  await this.page.reload({ waitUntil: "networkidle" });
});

When("{string} clicks {string}", async function (alias, buttonLabel) {
  this.getAccount(alias);
  await this.page.getByRole("button", { name: buttonLabel }).click();
});

When("user navigates to {string}", async function (path) {
  const resolved = this.resolvePlaceholders(path);
  const normalizedPath = resolved.startsWith("/") ? resolved : `/${resolved}`;
  await this.page.goto(`${this.baseUrl}${normalizedPath}`);
});

When("{string} navigates to {string}", async function (alias, path) {
  this.getAccount(alias);
  const resolved = this.resolvePlaceholders(path);
  const normalizedPath = resolved.startsWith("/") ? resolved : `/${resolved}`;
  await this.page.goto(`${this.baseUrl}${normalizedPath}`);
});

When("backend recovers", async function () {
  await this.page.unroute("**/api/me/households");
});

Then("{string} page is displayed", async function (pageName) {
  switch (pageName) {
    case "sign-in":
      await expect(this.page).toHaveURL(/\/sign-in(\?.*)?$/);
      await expect(this.page.getByRole("heading", { name: "Sign in to HomeKeeper" })).toBeVisible();
      break;
    case "welcome":
      await expect(this.page).toHaveURL(/\/welcome(\?.*)?$/);
      await expect(this.page.locator("#welcome-title")).toBeVisible();
      break;
    case "profile":
      await expect(this.page).toHaveURL(/\/profile(\?.*)?$/);
      await expect(this.page.locator("#profile-name")).toBeVisible();
      break;
    case "home":
      await expect(this.page).toHaveURL(/\/home(\?.*)?$/);
      break;
    default:
      throw new Error(`Unknown page "${pageName}". Supported pages: sign-in, welcome, profile, home.`);
  }
});

Then("message {string} is displayed", async function (message) {
  await expect(this.page.getByText(message)).toBeVisible();
});

Then("button {string} is displayed", async function (label) {
  await expect(this.page.getByRole("button", { name: label })).toBeVisible();
});

Then("option {string} is displayed", async function (title) {
  await expect(this.page.locator(".hk-choice__title", { hasText: title })).toBeVisible();
});

Then("option {string} is not displayed", async function (title) {
  await expect(this.page.locator(".hk-choice__title", { hasText: title })).toHaveCount(0);
});
