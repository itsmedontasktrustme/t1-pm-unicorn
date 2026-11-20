/*
 * Tasks (US5–US9 as updated on 20.11., HK-73 / HK-76 / HK-79 / HK-82 / HK-85).
 *
 * In the database a task is "todo" or "done". The frontend shows TO DO tasks as
 * Available (no assignee) or Assigned. Every task has a responsible manager (manager_id):
 * the manager who created it, or the one it was handed over to.
 *
 * Who may do what:
 *   create                 — any manager (they become the responsible manager)
 *   edit / delete / assign — the responsible manager, only TO DO tasks
 *   hand over              — the responsible manager, to another manager of the household
 *   pick up                — any housemate, TO DO task without an assignee
 *   give back              — the assignee of a TO DO task
 *   mark as done           — only the assignee; cookies only if done by the due date
 *   return                 — the responsible manager, DONE task back to TO DO (assignee stays)
 */
const database = require("../database");
const { badRequest, conflict, forbidden, notFound } = require("./errors");
const { listMembers, requireMembership } = require("./households");
const { taskQuery, toTask } = require("./taskRows");

const NAME_MAX = 100;
const DESCRIPTION_MAX = 2000;
const COOKIES_MIN = 1;
const COOKIES_MAX = 100;

const MESSAGES = {
  name: "Please enter a task name (max 100 characters)",
  cookies: "The number of cookies must be a whole number from 1 to 100",
  description: "The description can have at most 2000 characters",
  due: "Please enter a valid due date",
  notHousemate: "A task can only be assigned to a housemate of this household",
  notManager: "Only a manager can create tasks",
  onlyResponsibleEdits: "Only the responsible manager can edit this task",
  doneNoEdit: "A task with the status DONE cannot be edited",
  doneNoDelete: "A task with the status DONE cannot be deleted",
  handOverToManager: "Responsibility can only be handed over to a manager of this household",
  onlyResponsibleAssigns: "Only the responsible manager can assign this task",
  doneNoAssign: "A task with the status DONE cannot be assigned",
  alreadyAssigned: "This task already has an assignee",
  onlyAssigneeGivesBack: "Only the assignee can give this task back.",
  onlyAssigneeDone: "Only the assignee can mark this task as done",
  assignFirst: "Assign the task before marking it as done",
  alreadyDone: "This task is already done.",
  onlyResponsibleReturns: "Only the responsible manager can return a completed task",
  notFound: "This task no longer exists."
};

/** US5 7 / US6 7: checks the form; returns the values for the database or throws with texts per field. */
function validateTask(input = {}) {
  const fields = {};
  const name = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const rawCookies = input.cookies;
  const cookies = rawCookies === undefined || rawCookies === null || rawCookies === "" ? COOKIES_MIN : Number(rawCookies);
  let due = null;

  if (!name || name.length > NAME_MAX) {
    fields.title = MESSAGES.name;
  }
  if (description.length > DESCRIPTION_MAX) {
    fields.description = MESSAGES.description;
  }
  if (!Number.isInteger(cookies) || cookies < COOKIES_MIN || cookies > COOKIES_MAX) {
    fields.cookies = MESSAGES.cookies;
  }
  if (input.due) {
    due = new Date(input.due);
    if (Number.isNaN(due.getTime())) {
      fields.due = MESSAGES.due;
    }
  }

  if (Object.keys(fields).length > 0) {
    const first = fields.title || fields.cookies || fields.description || fields.due;
    throw badRequest(first, "invalid", fields);
  }
  return { name, description: description || null, cookies, due_dt: due };
}

async function householdContext(householdId, residentId) {
  const membership = await requireMembership(householdId, residentId);
  return { ...membership, me: Number(residentId), isManager: membership.roles.includes("manager") };
}

async function findTaskRow(householdId, taskId) {
  const id = Number(taskId);
  const row = Number.isInteger(id) && id > 0 ? await database("task").where({ id, household_id: householdId }).first() : null;
  if (!row) {
    throw notFound(MESSAGES.notFound);
  }
  return row;
}

async function loadTask(taskId) {
  return toTask(await taskQuery().where("t.id", taskId).first());
}

async function requireHousemate(householdId, residentId) {
  const id = Number(residentId);
  const members = await listMembers(householdId);
  const member = members.find((item) => item.id === String(id));
  if (!member) {
    throw badRequest(MESSAGES.notHousemate, "not-housemate");
  }
  return member;
}

function requireResponsible(row, me, message) {
  if (Number(row.manager_id) !== me) {
    throw forbidden(message, "not-responsible");
  }
}

/** HK-73 task list: tasks, housemates (for assigning) and who the resident is. */
async function listTasks(householdId, residentId) {
  const ctx = await householdContext(householdId, residentId);
  const [rows, members] = await Promise.all([
    taskQuery().where("t.household_id", ctx.householdId).orderBy("t.id"),
    listMembers(ctx.householdId)
  ]);
  const me = members.find((member) => member.id === String(ctx.me));
  return {
    tasks: rows.map(toTask),
    members: members.map(({ id, name, roles }) => ({ id, name, roles })),
    me: { id: me.id, name: me.name },
    isManager: ctx.isManager
  };
}

/** US5: a manager creates a TO DO task and becomes its responsible manager. */
async function createTask(householdId, residentId, input = {}) {
  const ctx = await householdContext(householdId, residentId);
  if (!ctx.isManager) {
    throw forbidden(MESSAGES.notManager, "not-manager");
  }
  const values = validateTask(input);
  const assignee = input.assigneeId ? await requireHousemate(ctx.householdId, input.assigneeId) : null;

  const [id] = await database("task").insert({
    ...values,
    household_id: ctx.householdId,
    status: "todo",
    assignee_id: assignee ? Number(assignee.id) : null,
    manager_id: ctx.me
  });
  return loadTask(id);
}

/** US6: the responsible manager edits name, description, due date and cookies of a TO DO task. */
async function updateTask(householdId, taskId, residentId, input = {}) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  requireResponsible(row, ctx.me, MESSAGES.onlyResponsibleEdits);
  if (row.status === "done") {
    throw conflict(MESSAGES.doneNoEdit, "done");
  }
  await database("task").where({ id: row.id }).update(validateTask(input));
  return loadTask(row.id);
}

/** US6 4a–4b: the responsible manager deletes a TO DO task. */
async function deleteTask(householdId, taskId, residentId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  requireResponsible(row, ctx.me, MESSAGES.onlyResponsibleEdits);
  if (row.status === "done") {
    throw conflict(MESSAGES.doneNoDelete, "done");
  }
  await database("task").where({ id: row.id }).delete();
}

/** US6 4c–4e: the responsible manager hands the task over to another manager. */
async function handOverTask(householdId, taskId, residentId, managerId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  requireResponsible(row, ctx.me, MESSAGES.onlyResponsibleEdits);
  const members = await listMembers(ctx.householdId);
  const target = members.find((member) => member.id === String(Number(managerId)));
  if (!target || !target.roles.includes("manager")) {
    throw badRequest(MESSAGES.handOverToManager, "not-manager");
  }
  await database("task").where({ id: row.id }).update({ manager_id: Number(target.id) });
  return loadTask(row.id);
}

/** US7: the responsible manager assigns or reassigns a TO DO task (also to themselves). */
async function assignTask(householdId, taskId, residentId, assigneeId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  requireResponsible(row, ctx.me, MESSAGES.onlyResponsibleAssigns);
  if (row.status === "done") {
    throw conflict(MESSAGES.doneNoAssign, "done");
  }
  const assignee = await requireHousemate(ctx.householdId, assigneeId);
  await database("task").where({ id: row.id }).update({ assignee_id: Number(assignee.id) });
  return loadTask(row.id);
}

/** US8: a housemate picks up a TO DO task without an assignee. */
async function pickUpTask(householdId, taskId, residentId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  // Guarded update so two housemates picking up at once cannot both get it.
  const updated = await database("task")
    .where({ id: row.id, status: "todo" })
    .whereNull("assignee_id")
    .update({ assignee_id: ctx.me });
  if (updated === 0) {
    throw conflict(MESSAGES.alreadyAssigned, "already-assigned");
  }
  return loadTask(row.id);
}

/** US8 4a–4b: the assignee gives a TO DO task back; it stays TO DO without an assignee. */
async function giveBackTask(householdId, taskId, residentId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  if (row.status !== "todo" || Number(row.assignee_id) !== ctx.me) {
    throw forbidden(MESSAGES.onlyAssigneeGivesBack, "not-assignee");
  }
  await database("task").where({ id: row.id }).update({ assignee_id: null });
  return loadTask(row.id);
}

/**
 * US9: the assignee marks the task as done. Cookies are credited when there is no due date
 * or it is done on or before the due date. Returns the task and the credited cookies.
 */
async function markTaskDone(householdId, taskId, residentId, now = new Date()) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  if (row.status === "done") {
    throw conflict(MESSAGES.alreadyDone, "done");
  }
  if (!row.assignee_id) {
    throw badRequest(MESSAGES.assignFirst, "no-assignee");
  }
  if (Number(row.assignee_id) !== ctx.me) {
    throw forbidden(MESSAGES.onlyAssigneeDone, "not-assignee");
  }

  const onTime = !row.due_dt || now <= new Date(row.due_dt);
  const credited = onTime ? row.cookies : 0;
  await database("task").where({ id: row.id, status: "todo" }).update({
    status: "done",
    credited_cookies: credited,
    completed_dt: now,
    completed_by: ctx.me
  });
  return { task: await loadTask(row.id), credited };
}

/** US9 4a–4c: the responsible manager returns a DONE task to TO DO; the assignee stays, cookies no longer count. */
async function returnTask(householdId, taskId, residentId) {
  const ctx = await householdContext(householdId, residentId);
  const row = await findTaskRow(ctx.householdId, taskId);
  requireResponsible(row, ctx.me, MESSAGES.onlyResponsibleReturns);
  if (row.status === "done") {
    await database("task")
      .where({ id: row.id })
      .update({ status: "todo", credited_cookies: 0, completed_dt: null, completed_by: null });
  }
  return loadTask(row.id);
}

module.exports = {
  MESSAGES,
  validateTask,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  handOverTask,
  assignTask,
  pickUpTask,
  giveBackTask,
  markTaskDone,
  returnTask
};
