const { writeHistoryLog } = require("../logic/historyLogger");

function registerHistoryActionEndpoint(app) {
  app.post("/api/history/action", function(req, res) {
    const { component, user, action } = req.body || {};

    if (!component || !action) {
      return res.status(400).json({
        error: "component and action are required"
      });
    }

    const message = writeHistoryLog({ component, user, action });

    return res.status(200).json({
      ok: true,
      message
    });
  });
}

module.exports = { registerHistoryActionEndpoint };
