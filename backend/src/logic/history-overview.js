/*
 * US10 history overview (HK-88 resident, HK-91 household), built from DONE tasks:
 * who completed what, when, who marked it as done and how many cookies were credited (US9 7).
 * The activity log of the frontend (logic/history.js, table `history`) is something else.
 */
const database = require("../database");
const { listMembers, listMyHouseholds, requireMembership } = require("./households");

function completedQuery() {
  return database("task as t")
    .join("household as hh", "hh.id", "t.household_id")
    .leftJoin("resident as a", "a.id", "t.assignee_id")
    .leftJoin("resident as c", "c.id", "t.completed_by")
    .where("t.status", "done")
    .orderBy("t.completed_dt", "desc")
    .orderBy("t.id", "desc")
    .select(
      "t.id",
      "t.name",
      "t.assignee_id",
      "t.completed_by",
      "t.completed_dt",
      "t.credited_cookies",
      "hh.id as household_id",
      "hh.name as household_name",
      "a.name as assignee_name",
      "c.name as completed_by_name"
    );
}

function toCompleted(row) {
  return {
    id: String(row.id),
    title: row.name,
    memberId: row.assignee_id === null ? null : String(row.assignee_id),
    assigneeName: row.assignee_name || "Former housemate",
    markedById: row.completed_by === null ? null : String(row.completed_by),
    markedByName: row.completed_by_name || "Former housemate",
    completedAt: new Date(row.completed_dt).toISOString(),
    cookies: row.credited_cookies || 0,
    householdId: String(row.household_id),
    householdName: row.household_name
  };
}

/** HK-91 (US10 steps 2–5): completed tasks of a household and every housemate's cookies. */
async function householdHistory(householdId, residentId) {
  const { householdId: id } = await requireMembership(householdId, residentId);
  const [household, rows, members] = await Promise.all([
    database("household").where({ id }).first(),
    completedQuery().where("t.household_id", id),
    listMembers(id)
  ]);
  return {
    meId: String(residentId),
    householdName: household.name,
    completed: rows.map(toCompleted),
    totals: members
      .map(({ id: memberId, name, cookies }) => ({ id: memberId, name, cookies }))
      .sort((a, b) => b.cookies - a.cookies)
  };
}

/** HK-88 (US10 2a–2b): the resident's own completed tasks and cookies across all households. */
async function myHistory(residentId) {
  const households = await listMyHouseholds(residentId);
  const ids = households.map((household) => Number(household.id));
  const [rows, perHousehold] = await Promise.all([
    ids.length > 0 ? completedQuery().whereIn("t.household_id", ids).where("t.assignee_id", residentId) : [],
    Promise.all(
      households.map(async (household) => {
        const me = (await listMembers(household.id)).find((member) => member.id === String(residentId));
        return { id: household.id, name: household.name, cookies: me ? me.cookies : 0 };
      })
    )
  ]);
  return {
    meId: String(residentId),
    totalCookies: perHousehold.reduce((sum, item) => sum + item.cookies, 0),
    perHousehold,
    completed: rows.map(toCompleted)
  };
}

module.exports = { householdHistory, myHistory };
