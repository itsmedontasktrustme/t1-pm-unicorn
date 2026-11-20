const { requireAuth } = require("../logic/auth");
const { handle } = require("../logic/errors");
const { ensureResident, requireResident } = require("../logic/residents");

function registerResidentEndpoints(app) {
  // HK-55 / HK-58: called after every Google sign-in. Creates the resident on the first one.
  // Identity comes from the verified token; the body only carries the Clerk profile (name, e-mail).
  app.post(
    "/api/me",
    requireAuth,
    handle(async (req) => {
      const { name, email } = req.body || {};
      return { resident: await ensureResident(req.auth.userId, { name, email }) };
    })
  );

  app.get(
    "/api/me",
    requireResident,
    handle(async (req) => ({ resident: req.resident }))
  );
}

module.exports = { registerResidentEndpoints };
