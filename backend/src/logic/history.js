const database = require("../database");
const { writeHistoryLog } = require("./historyLogger");

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

async function fetchHistoryEntriesForUser(userId, page = 1, limit = 20) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.min(20, Math.max(1, Number(limit) || 20));
  const offset = (normalizedPage - 1) * normalizedLimit;

  const baseQuery = database("history")
    .select("id", "component", "user_id", "action", "create_dt")
    .orderBy("create_dt", "desc");

  if (userId) {
    baseQuery.where("user_id", String(userId));
  }

  const [countRow, rows] = await Promise.all([
    baseQuery.clone().count({ count: "*" }).first(),
    baseQuery.clone().limit(normalizedLimit).offset(offset)
  ]);

  const total = Number(countRow?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));

  return {
    data: rows.map((row) => ({
      id: row.id,
      component: row.component,
      userId: row.user_id,
      action: row.action,
      createdAt: row.create_dt
    })),
    page: normalizedPage,
    limit: normalizedLimit,
    total,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1
  };
}

module.exports = {
  saveHistoryEntry,
  fetchHistoryEntriesForUser,
  writeHistoryLog
};
