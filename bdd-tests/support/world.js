const { setWorldConstructor, World } = require("@cucumber/cucumber");
const { chromium } = require("playwright");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

class HomekeeperWorld extends World {
  constructor(options) {
    super(options);
    this.baseUrl = process.env.BASE_URL || "http://localhost:80";
    this.oidcAdminUrl = process.env.OIDC_ADMIN_URL || "http://localhost:8080";
    this.accounts = new Map();
    this.constants = new Map();
    this.residentIds = new Map();
    this.currentAccount = null;
    this.currentSessionId = null;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.db = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false"
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    this.db = await mysql.createConnection({
      host: process.env.DATABASE_HOST || "127.0.0.1",
      port: Number(process.env.DATABASE_PORT || 3306),
      user: process.env.DATABASE_USER || "root",
      password: process.env.DATABASE_PASSWORD || fs.readFileSync(path.join(__dirname, "../../db/password.txt"), "utf8").trim(),
      database: process.env.DATABASE_DB || "homekeeper"
    });
  }

  async cleanup() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    if (this.db) await this.db.end();
  }

  getAccount(alias) {
    const account = this.accounts.get(alias);
    if (!account) {
      throw new Error(`Unknown Google account alias "${alias}". Define it in Background.`);
    }
    return account;
  }

  /**
   * Replaces {constantName} from Background constants and {alias.field} from Background accounts.
   */
  resolvePlaceholders(text) {
    return text.replace(/\{([^}]+)\}/g, (match, expr) => {
      const trimmed = expr.trim();
      if (this.constants.has(trimmed)) {
        return this.constants.get(trimmed);
      }

      const dotIndex = trimmed.lastIndexOf(".");
      if (dotIndex !== -1) {
        const alias = trimmed.slice(0, dotIndex).trim();
        const field = trimmed.slice(dotIndex + 1).trim();
        const account = this.getAccount(alias);
        if (!(field in account)) {
          throw new Error(`Unknown account field "${field}" for alias "${alias}".`);
        }
        return account[field];
      }

      throw new Error(`Unknown placeholder "{${trimmed}}". Define it in Background constants or accounts.`);
    });
  }

  /**
   * Configures the identity that the local OIDC mock server (e.g. oauth2-mock-server)
   * will issue in the next JWT token (sub, name, email).
   */
  async selectOidcAccount(account) {
    const res = await fetch(`${this.oidcAdminUrl}/test/next-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sub: account.sub,
        name: account.name || null,
        email: account.email,
        createdAt: account.createdAt || null
      })
    });
    if (!res.ok) {
      throw new Error(`OIDC mock server rejected next-user (${res.status})`);
    }
  }
}

setWorldConstructor(HomekeeperWorld);
