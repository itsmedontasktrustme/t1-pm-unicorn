const {
  fetchHistoryEntriesForUser,
  saveHistoryEntry,
  writeHistoryLog
} = require("../logic/history");

function registerHistoryActionEndpoint(app) {
  app.get("/api/history/action/:userId", async function(req, res) {
    try {
      const result = await fetchHistoryEntriesForUser(req.params.userId, req.query.page, req.query.limit);

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

    const message = writeHistoryLog({ component, user, action });

    try {
      await saveHistoryEntry({ component, user, action });

      return res.status(200).json({
        ok: true,
        persisted: true,
        message
      });
    } catch (error) {
      console.error("Unable to persist history action to database", error);

      return res.status(200).json({
        ok: true,
        persisted: false,
        message,
        warning: "History message was logged locally, but the database insert failed."
      });
    }
  });
}

module.exports = { registerHistoryActionEndpoint };
