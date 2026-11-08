const {
  fetchHistoryEntriesForUser,
  saveHistoryEntry,
  writeHistoryLog
} = require("../logic/history");
const {
  assertAuthenticatedUserMatches,
  getAuthenticatedUserId,
  normalizeUserId
} = require("../logic/auth");

function registerHistoryActionEndpoint(app) {
  app.get("/api/history/action/:userId", async function(req, res) {
    const requestedUserId = req.params.userId;
    const authCheck = assertAuthenticatedUserMatches(req, requestedUserId);

    if (authCheck) {
      return res.status(authCheck.status).json({
        ok: false,
        error: authCheck.error
      });
    }

    try {
      const result = await fetchHistoryEntriesForUser(requestedUserId, req.query.page, req.query.limit);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      console.error("Unable to fetch history actions for user", error);

      return res.status(500).json({
        ok: false,
        error: "Unable to fetch history actions for user"
      });
    }
  });

  app.post("/api/history/action", async function(req, res) {
    const { component, user, action } = req.body || {};

    if (!component || !action) {
      return res.status(400).json({
        error: "component and action are required"
      });
    }

    const requestUserId = normalizeUserId(user) || getAuthenticatedUserId(req);
    const authCheck = assertAuthenticatedUserMatches(req, requestUserId);

    if (authCheck) {
      return res.status(authCheck.status).json({
        ok: false,
        error: authCheck.error
      });
    }

    const effectiveUser = { ...(user || {}), id: requestUserId };
    const message = writeHistoryLog({ component, user: effectiveUser, action });

    try {
      await saveHistoryEntry({ component, user: effectiveUser, action });

      return res.status(200).json({
        ok: true,
        persisted: true,
        message
      });
    } catch (error) {
      console.error("Unable to persist history action to database", error);

      return res.status(500).json({
        ok: false,
        persisted: false,
        message,
        warning: "History message was logged locally, but the database insert failed."
      });
    }
  });
}

module.exports = { registerHistoryActionEndpoint };
