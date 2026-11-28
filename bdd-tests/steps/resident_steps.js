const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("@playwright/test");

const LOGGED_SESSION_KEY = "homekeeper.auth.loggedSignInSession";

async function signInWithGoogle(world, alias) {
  const account = world.getAccount(alias);

  const signedInUserId = await world.page.evaluate(
    () => JSON.parse(window.sessionStorage.getItem("homekeeper.e2e.auth"))?.user?.id || null
  );
  if (signedInUserId && signedInUserId !== account.sub) {
    await world.page.evaluate(() => window.sessionStorage.removeItem("homekeeper.e2e.auth"));
    await world.page.goto(`${world.baseUrl}/sign-in`);
  } else if (!world.page.url().includes("/sign-in")) {
    await world.page.goto(`${world.baseUrl}/sign-in`);
  }
  await expect(world.page.getByRole("heading", { name: "Sign in to HomeKeeper" })).toBeVisible();

  await world.selectOidcAccount({
    ...account,
    createdAt: account.residentExists === false ? new Date().toISOString() : "2000-01-01T00:00:00.000Z"
  });

  const meResponsePromise = world.page.waitForResponse(
    (response) => response.url().endsWith("/api/me") &&
      response.request().method() === "POST" && response.ok()
  );

  await world.page.getByRole("button", { name: /Continue with Google/i }).click({ noWaitAfter: true });
  await meResponsePromise;
  await expect(world.page).toHaveURL(/\/welcome$/);

  world.currentAccount = account;
  world.currentSessionId = await world.page.evaluate(
    () => JSON.parse(window.sessionStorage.getItem("homekeeper.e2e.auth"))?.sessionId || null
  );
}

// --- Background ---

Given("the following Google accounts:", function (dataTable) {
  for (const row of dataTable.hashes()) {
    const alias = row.alias.trim();
    const slug = alias.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    this.accounts.set(alias, {
      alias,
      sub: `oidc_${slug}`,
      name: (row.name || "").trim(),
      alternativeName: (row["alternative name"] || "").trim(),
      email: (row.email || "").trim()
    });
  }
});

Given("user is on the sign-in page", async function () {
  await this.page.goto(`${this.baseUrl}/sign-in`);
  await expect(this.page.getByRole("heading", { name: "Sign in to HomeKeeper" })).toBeVisible();
});

// --- Scenario: New resident signs into Homekeeper for the first time ---

Given("resident {string} does not exist", async function (alias) {
  const account = this.getAccount(alias);
  account.residentExists = false;
  this.currentAccount = account;
  await this.db.execute(
    "DELETE FROM resident WHERE auth_user_id = ? OR email = ?",
    [account.sub, account.email]
  );
});

Given("resident {string} exists", async function (alias) {
  const account = this.getAccount(alias);
  account.residentExists = true;
  this.currentAccount = account;
  const dbName = account.name || account.alternativeName;
  await this.db.execute(
    `INSERT INTO resident (auth_user_id, name, email)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email)`,
    [account.sub, dbName, account.email]
  );

  const [rows] = await this.db.execute(
    "SELECT id FROM resident WHERE auth_user_id = ?",
    [account.sub]
  );
  await this.db.execute("DELETE FROM housemate WHERE resident_id = ?", [rows[0].id]);
  this.residentIds.set(alias, rows[0].id);
});

Given("Google profile for {string} has updated name {string}", function (alias, updatedName) {
  const account = this.getAccount(alias);
  account.name = updatedName;
});

Given("Google OAuth provider is unavailable", async function () {
  await this.page.route("**/oidc/test/token", (route) => route.abort("failed"));
});

Given("the resident's session token is expired or invalid", async function () {
  await this.page.route("**/api/**", async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: "Bearer invalid.expired.token"
    };
    await route.continue({ headers });
  });
});

Given("backend returns server error for resident households", async function () {
  await this.page.route("**/api/me/households", (route) => route.abort("failed"));
});

Given("{string} is signed in", async function (alias) {
  if (!this.page.url().includes("/sign-in")) {
    await this.page.goto(`${this.baseUrl}/sign-in`);
  }
  await signInWithGoogle(this, alias);
  await expect(this.page).toHaveURL(/\/(welcome|home)/);
});

When("{string} signs in with Google", async function (alias) {
  await signInWithGoogle(this, alias);
});

When("{string} cancels signing in with Google", async function (alias) {
  const account = this.getAccount(alias);
  this.currentAccount = account;

  await this.page.route("**/oidc/test/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ cancelled: true })
    })
  );

  await this.page.getByRole("button", { name: /Continue with Google/i }).click();
  await expect(this.page).toHaveURL(/\/sign-in\?status=cancelled/);
});

When("{string} signs out", async function (alias) {
  const account = this.getAccount(alias);
  this.currentAccount = account;

  if (!this.page.url().includes("/profile")) {
    await this.page.goto(`${this.baseUrl}/profile`);
  }

  const signOutLogPromise = this.page.waitForResponse(
    (res) => res.url().includes("/api/auth/sign-out") && res.request().method() === "POST"
  );

  await this.page.getByRole("button", { name: "Sign out" }).click();

  const signOutLogResponse = await signOutLogPromise;
  expect(signOutLogResponse.status()).toBe(200);
  await expect(this.page).toHaveURL(/\/sign-in(\?.*)?$/);
});

When("user navigates to the sign-in page", async function () {
  await this.page.goto(`${this.baseUrl}/sign-in`);
});

Then("{string} page is displayed for resident {string}", async function (pageName, alias) {
  const account = this.getAccount(alias);
  const expectedName = account.name || account.alternativeName;

  switch (pageName) {
    case "welcome":
      await expect(this.page).toHaveURL(/\/welcome(\?.*)?$/);
      await expect(this.page.locator(".hk-profile-card__name")).toHaveText(expectedName);
      await expect(this.page.locator(".hk-profile-card__email")).toHaveText(account.email);
      break;
    case "profile":
      await expect(this.page).toHaveURL(/\/profile(\?.*)?$/);
      await expect(this.page.locator("#profile-name")).toHaveText(expectedName);
      break;
    case "home":
      await expect(this.page).toHaveURL(/\/home(\?.*)?$/);
      break;
    default:
      throw new Error(`Unknown page "${pageName}". Supported pages: welcome, profile, home.`);
  }
});

Then("resident {string} exists in Homekeeper", async function (alias) {
  const account = this.getAccount(alias);
  const expectedName = account.name || account.alternativeName;

  const [rows] = await this.db.execute(
    "SELECT id, auth_user_id, name, email FROM resident WHERE auth_user_id = ?",
    [account.sub]
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe(expectedName);
  expect(rows[0].email).toBe(account.email);
});

Then("resident {string} does not exist in Homekeeper", async function (alias) {
  const account = this.getAccount(alias);

  const [rows] = await this.db.execute(
    "SELECT id FROM resident WHERE auth_user_id = ? OR email = ?",
    [account.sub, account.email]
  );

  expect(rows).toHaveLength(0);
});

Then("resident {string} is created with alternative name", async function (alias) {
  const account = this.getAccount(alias);
  expect(account.alternativeName, `Alternative name is not defined for "${alias}"`).toBeTruthy();

  const [rows] = await this.db.execute(
    "SELECT id, auth_user_id, name, email FROM resident WHERE auth_user_id = ?",
    [account.sub]
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe(account.alternativeName);
  expect(rows[0].email).toBe(account.email);
});

Then("exactly one {string} event is recorded for the current session", async function (event) {
  if (!["sign-in", "sign-out"].includes(event)) {
    throw new Error(`Unknown auth event "${event}". Expected "sign-in" or "sign-out".`);
  }

  const loggedSessionId = await this.page.evaluate(
    (key) => window.localStorage.getItem(key),
    LOGGED_SESSION_KEY
  );
  const sessionId = this.currentSessionId || loggedSessionId;

  expect(sessionId, "Expected an active sessionId to be recorded").toBeTruthy();
  if (event === "sign-in") {
    expect(loggedSessionId).toBe(sessionId);
  } else if (event === "sign-out") {
    expect(loggedSessionId).toBeNull();
  }

  const [authLogRows] = await this.db.execute(
    "SELECT id, user_id, session_id, event FROM auth_log WHERE session_id = ? AND event = ?",
    [sessionId, event]
  );

  expect(authLogRows).toHaveLength(1);
  if (this.currentAccount) {
    expect(authLogRows[0].user_id).toBe(this.currentAccount.sub);
  }
});

Then("resident {string} keeps the same resident ID", async function (alias) {
  const account = this.getAccount(alias);
  const previousId = this.residentIds.get(alias);

  expect(previousId, `No initial resident ID stored for "${alias}"`).toBeDefined();

  const [rows] = await this.db.execute(
    "SELECT id FROM resident WHERE auth_user_id = ?",
    [account.sub]
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(previousId);
});

Then("resident {string} has name {string}", async function (alias, expectedName) {
  const account = this.getAccount(alias);

  const [rows] = await this.db.execute(
    "SELECT name FROM resident WHERE auth_user_id = ?",
    [account.sub]
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe(expectedName);
});

Then("no duplicate resident record is created", async function () {
  expect(this.currentAccount, "Expected a signed-in account in current scenario").toBeTruthy();

  const [rows] = await this.db.execute(
    "SELECT id FROM resident WHERE auth_user_id = ? OR email = ?",
    [this.currentAccount.sub, this.currentAccount.email]
  );

  expect(rows).toHaveLength(1);
});