const {
  fetchHistoryEntriesForUser,
  saveHistoryEntry,
  writeHistoryLog
} = require("../logic/history");
const { normalizeUserId, requireAuth, requireSelf } = require("../logic/auth");

function registerHistoryActionEndpoint(app) {
  // A resident can only read their own activity log.
  app.get("/api/history/action/:userId", requireAuth, requireSelf("userId"), async function(req, res) {
    try {
      const result = await fetchHistoryEntriesForUser(req.auth.userId, req.query.page, req.query.limit);

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

  app.post("/api/history/action", requireAuth, async function(req, res) {
    const { component, user, action } = req.body || {};

    if (!component || !action) {
      return res.status(400).json({
        error: "component and action are required"
      });
    }

    // The user id always comes from the verified token; a different id in the body is rejected.
    const bodyUserId = normalizeUserId(user);
    if (bodyUserId && bodyUserId !== req.auth.userId) {
      return res.status(403).json({
        ok: false,
        code: "forbidden",
        error: "Forbidden: history records can only be stored for the authenticated user"
      });
    }

    const effectiveUser = { ...(user || {}), id: req.auth.userId };
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
