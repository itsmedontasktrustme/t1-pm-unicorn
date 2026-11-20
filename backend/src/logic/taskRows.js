/* Task rows → the Task shape of the frontend (api/tasks.js). Shared by tasks.js and households.js. */
const database = require("../database");

const iso = (value) => (value ? new Date(value).toISOString() : null);
const idOrNull = (value) => (value === null || value === undefined ? null : String(value));

function toTask(row) {
  const status = row.status === "done" ? "done" : row.assignee_id ? "assigned" : "available";
  return {
    id: String(row.id),
    title: row.name,
    description: row.description || "",
    assigneeId: idOrNull(row.assignee_id),
    assigneeName: row.assignee_name || null,
    managerId: idOrNull(row.manager_id),
    managerName: row.manager_name || null,
    due: iso(row.due_dt),
    cookies: row.cookies,
    status,
    completedAt: iso(row.completed_dt),
    markedById: idOrNull(row.completed_by),
    markedByName: row.completed_by_name || null,
    // Cookies the assignee got for a DONE task (US9 7) — the history and the counters use it.
    creditedCookies: status === "done" ? row.credited_cookies || 0 : 0
  };
}

/** Task query with the names of assignee, manager and who marked it done. */
function taskQuery() {
  return database("task as t")
    .leftJoin("resident as a", "a.id", "t.assignee_id")
    .leftJoin("resident as m", "m.id", "t.manager_id")
    .leftJoin("resident as c", "c.id", "t.completed_by")
    .select("t.*", "a.name as assignee_name", "m.name as manager_name", "c.name as completed_by_name");
}

module.exports = { toTask, taskQuery, iso };
