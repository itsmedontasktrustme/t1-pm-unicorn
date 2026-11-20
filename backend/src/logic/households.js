/*
 * Households and housemates (US1, US4 roles, HK-61 household view, HK-67 profile).
 *
 * Roles: every member is a housemate; "owner" and "manager" are extra roles (housemate_role).
 * The frontend gets roles as ["owner", "manager"], ["manager"] or ["housemate"].
 * Cookies of a housemate = sum of cookies of their DONE tasks in that household (BR-CK-05).
 * Invitees (joined with a code, not accepted yet) are not members: they do not see the household.
 */
const database = require("../database");
const { badRequest, notFound } = require("./errors");
const { taskQuery, toTask } = require("./tasks");

const NAME_MAX = 20;
const DESCRIPTION_MAX = 255;
const MESSAGES = {
  name: "Please enter a household name (max 20 characters)",
  description: "The description can have at most 255 characters",
  notFound: "Household not found.",
  memberNotFound: "Housemate not found."
};

function rolesOf(roleList) {
  const roles = ["owner", "manager"].filter((role) => roleList.includes(role));
  return roles.length > 0 ? roles : ["housemate"];
}

/** Cookies per resident in one household: { residentId: cookies }. */
async function cookiesByResident(householdId) {
  const rows = await database("task")
    .where({ household_id: householdId, status: "done" })
    .whereNotNull("assignee_id")
    .groupBy("assignee_id")
    .select("assignee_id")
    .sum({ cookies: "cookies" });
  return Object.fromEntries(rows.map((row) => [String(row.assignee_id), Number(row.cookies) || 0]));
}

/** Members of a household (status member) with roles and cookies, owner first. */
async function listMembers(householdId) {
  const rows = await database("housemate as h")
    .join("resident as r", "r.id", "h.resident_id")
    .leftJoin("housemate_role as hr", "hr.housemate_id", "h.id")
    .where({ "h.household_id": householdId, "h.status": "member" })
    .select("h.id as housemate_id", "r.id as resident_id", "r.name", "hr.role", "h.create_dt");
  const cookies = await cookiesByResident(householdId);

  const byResident = new Map();
  rows.forEach((row) => {
    const id = String(row.resident_id);
    if (!byResident.has(id)) {
      byResident.set(id, { id, name: row.name, roleList: [], since: row.create_dt });
    }
    if (row.role) {
      byResident.get(id).roleList.push(row.role);
    }
  });

  const rank = (member) => (member.roles.includes("owner") ? 0 : member.roles.includes("manager") ? 1 : 2);
  return [...byResident.values()]
    .map(({ id, name, roleList, since }) => ({ id, name, roles: rolesOf(roleList), cookies: cookies[id] || 0, since }))
    .sort((a, b) => rank(a) - rank(b) || new Date(a.since) - new Date(b.since))
    .map(({ since: _since, ...member }) => member);
}

/** Membership of the resident in the household: { housemateId, status, roles } or null. */
async function findMembership(householdId, residentId) {
  const row = await database("housemate").where({ household_id: householdId, resident_id: residentId }).first();
  if (!row) {
    return null;
  }
  const roleRows = await database("housemate_role").where({ housemate_id: row.id }).select("role");
  return { housemateId: row.id, status: row.status, roles: rolesOf(roleRows.map((item) => item.role)) };
}

/** Only members see a household; for everyone else it does not exist (404, nothing leaks). */
async function requireMembership(householdId, residentId) {
  const id = Number(householdId);
  const membership = Number.isInteger(id) && id > 0 ? await findMembership(id, residentId) : null;
  if (!membership || membership.status !== "member") {
    throw notFound(MESSAGES.notFound);
  }
  return { householdId: id, ...membership };
}

async function listMyHouseholds(residentId) {
  const rows = await database("household as hh")
    .join("housemate as h", "h.household_id", "hh.id")
    .where({ "h.resident_id": residentId, "h.status": "member" })
    .orderBy("h.create_dt")
    .select("hh.id", "hh.name");
  return rows.map((row) => ({ id: String(row.id), name: row.name }));
}

function validateHousehold({ name, description }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";
  const fields = {};
  if (!cleanName || cleanName.length > NAME_MAX) {
    fields.name = MESSAGES.name;
  }
  if (cleanDescription.length > DESCRIPTION_MAX) {
    fields.description = MESSAGES.description;
  }
  if (Object.keys(fields).length > 0) {
    throw badRequest(fields.name || fields.description, "invalid", fields);
  }
  return { name: cleanName, description: cleanDescription || null };
}

/** US1: create a household; the creator becomes owner and manager. */
async function createHousehold(residentId, input) {
  const household = validateHousehold(input || {});
  return database.transaction(async (trx) => {
    const [householdId] = await trx("household").insert(household);
    const [housemateId] = await trx("housemate").insert({ household_id: householdId, resident_id: residentId, status: "member" });
    await trx("housemate_role").insert([
      { housemate_id: housemateId, role: "owner" },
      { housemate_id: housemateId, role: "manager" }
    ]);
    return { id: String(householdId), name: household.name, description: household.description || "" };
  });
}

/** HK-61: household with members (roles, cookies) and its tasks. */
async function getHousehold(householdId, residentId) {
  const { householdId: id } = await requireMembership(householdId, residentId);
  const household = await database("household").where({ id }).first();
  const [members, taskRows] = await Promise.all([
    listMembers(id),
    taskQuery().where("t.household_id", id).orderBy("t.id")
  ]);
  return {
    id: String(household.id),
    name: household.name,
    description: household.description || "",
    meId: String(residentId),
    members,
    tasks: taskRows.map(toTask)
  };
}

/** HK-67 resident profile: the resident's roles and cookies in each household. */
async function listMyMemberships(residentId) {
  const households = await listMyHouseholds(residentId);
  return Promise.all(
    households.map(async (household) => {
      const me = (await listMembers(household.id)).find((member) => member.id === String(residentId));
      return { id: household.id, name: household.name, roles: me.roles, cookies: me.cookies };
    })
  );
}

/** Housemate profile: member, current tasks, recently completed and counts. */
async function getMemberProfile(householdId, memberId, residentId) {
  const viewer = await requireMembership(householdId, residentId);
  const member = (await listMembers(viewer.householdId)).find((item) => item.id === String(memberId));
  if (!member) {
    throw notFound(MESSAGES.memberNotFound);
  }

  const rows = await taskQuery().where({ "t.household_id": viewer.householdId, "t.assignee_id": Number(member.id) });
  const tasks = rows.map(toTask);
  const currentTasks = tasks
    .filter((task) => task.status === "assigned")
    .sort((a, b) => (a.due ? new Date(a.due) : Infinity) - (b.due ? new Date(b.due) : Infinity));
  const completed = tasks
    .filter((task) => task.status === "done")
    .map((task) => ({ ...task, memberId: task.assigneeId }))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    meId: String(residentId),
    member,
    viewerIsOwner: viewer.roles.includes("owner"),
    currentTasks,
    completed: completed.slice(0, 5),
    stats: {
      assignedNow: currentTasks.length,
      done: completed.length,
      doneThisWeek: completed.filter((task) => new Date(task.completedAt).getTime() >= weekAgo).length
    }
  };
}

module.exports = {
  MESSAGES,
  rolesOf,
  listMembers,
  findMembership,
  requireMembership,
  listMyHouseholds,
  createHousehold,
  getHousehold,
  listMyMemberships,
  getMemberProfile
};
