const database = require("../database");
const { writeHistoryLog } = require("../logic/historyLogger");

function normalizeUserId(user) {
  const rawUserId = user?.id ?? user?.userId ?? null;

  if (rawUserId === null || rawUserId === undefined) {
    return null;
  }

  return String(rawUserId);
}


async function saveHistoryEntry({ component, user, action }) {
  await database("history").insert({
    component,
    user_id: normalizeUserId(user),
    action
  });
}

async function fetchHistoryEntriesForUser(userId) {
  const query = database("history")
    .select("id", "component", "user_id", "action", "create_dt")
    .orderBy("create_dt", "desc");

  if (userId) {
    query.where("user_id", String(userId));
  }

  const rows = await query;

  return rows.map((row) => ({
    id: row.id,
    component: row.component,
    userId: row.user_id,
    action: row.action,
    createdAt: row.create_dt
  }));
}

function registerHistoryActionEndpoint(app) {
  app.get("/api/history/action/:userId", async function(req, res) {
    try {
      const rows = await fetchHistoryEntriesForUser(req.params.userId);

      return res.status(200).json({
        ok: true,
        data: rows
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
