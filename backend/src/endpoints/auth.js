const authLog = require("../logic/authLog");
const { requireAuth } = require("../logic/auth");

function displayNameOf(user) {
  const name = user?.fullName || user?.firstName || user?.name;
  return typeof name === "string" ? name.slice(0, 255) : null;
}

function authEventHandler(event) {
  return async function(req, res, next) {
    if (!req.auth.sessionId) {
      return res.status(400).json({
        ok: false,
        code: "validationError",
        error: "The token is not a session token"
      });
    }

    try {
      const result = await authLog.recordAuthEvent({
        event,
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        // The name is only used in the log line; identity always comes from the token.
        userName: displayNameOf(req.body?.user),
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });

      return res.status(200).json({
        ok: true,
        event,
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        recorded: result.recorded,
        persisted: result.persisted
      });
    } catch (error) {
      return next(error);
    }
  };
}

function registerAuthEndpoints(app) {
  // Who am I — handy for the frontend and for checking that the token is accepted.
  app.get("/api/auth/me", requireAuth, function(req, res) {
    return res.status(200).json({
      ok: true,
      userId: req.auth.userId,
      sessionId: req.auth.sessionId
    });
  });

  // Called by the frontend once a Clerk session is active (after Google sign-in).
  app.post("/api/auth/sign-in", requireAuth, authEventHandler(authLog.AUTH_EVENTS.SIGN_IN));

  // Called by the frontend right before clerk.signOut(), while the token is still valid.
  app.post("/api/auth/sign-out", requireAuth, authEventHandler(authLog.AUTH_EVENTS.SIGN_OUT));
}

module.exports = { registerAuthEndpoints };
