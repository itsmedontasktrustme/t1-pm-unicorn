/*
 * Tests that need the database. They run against the MariaDB from DATABASE_* (docker compose
 * or a local server with db/schema + db/migrations applied) and are skipped when it is not reachable.
 */
const database = require("../../src/database");

let available = null;

async function databaseAvailable() {
  if (available === null) {
    try {
      await database.raw("select 1");
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

/** Call inside describe(): skips the whole block without a database. */
function requireDatabase() {
  before(async function() {
    if (!(await databaseAvailable())) {
      this.skip();
    }
  });
}

/** A Clerk user id that is unique for this test run. */
function uniqueUserId(label = "user") {
  return `test_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { database, requireDatabase, uniqueUserId };
