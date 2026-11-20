/*
 * Task API (US5–US9 as updated on 20.11.; Web-Backend Connection HK-73, HK-76, HK-79, HK-82, HK-85).
 *
 * Calls the backend (/api/households/:id/tasks, see api/client.js). Without a Clerk key (local demo)
 * and in unit tests the same functions work on the placeholder data of api/households.js.
 *
 * Rules (the same in the backend):
 *   - a task is TO DO or DONE; a TO DO task is shown as Available (no assignee) or Assigned
 *   - the manager who creates a task is its responsible manager (managerId); only they edit,
 *     delete, assign, hand over (to another manager) and return it
 *   - any housemate picks up an Available task; the assignee can give it back
 *   - only the assignee marks it as done; cookies only if done on or before the due date
 *   - returning a DONE task keeps the assignee; its cookies no longer count
 * The screens never offer an action the resident is not allowed to do, so most errors
 * only show up when someone else changed the task meanwhile.
 */
import { ApiError, placeholderStore } from "./households";
import { request, USE_PLACEHOLDER_API } from "./client";

const { load, save, delay, residentOf, isMember } = placeholderStore;

export const TASK_NAME_MAX = 100;
export const TASK_DESCRIPTION_MAX = 2000;
export const TASK_COOKIES = { min: 1, max: 100, default: 1 };

export const MESSAGES = {
  name: "Please enter a task name (max 100 characters)",
  cookies: "The number of cookies must be a whole number from 1 to 100",
  description: "The description can have at most 2000 characters",
  dueInPast: "Due date can’t be in the past.",
  notManager: "Only a manager can create tasks",
  notHousemate: "A task can only be assigned to a housemate of this household",
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

const tasksPath = (householdId) => `/households/${encodeURIComponent(householdId)}/tasks`;
const taskPath = (householdId, taskId) => `${tasksPath(householdId)}/${encodeURIComponent(taskId)}`;

/**
 * Validates the task form (US5 7a / 7c / 7d). A past due date is rejected for new tasks;
 * an unchanged one may stay when editing (HK-202). Empty cookies = 1.
 */
export function validateTask(input, { now = new Date(), isNew = true, previousDue = null } = {}) {
  const fields = {};
  const title = (input.title || "").trim();
  const description = (input.description || "").trim();

  if (!title || title.length > TASK_NAME_MAX) {
    fields.title = MESSAGES.name;
  }
  if (description.length > TASK_DESCRIPTION_MAX) {
    fields.description = MESSAGES.description;
  }
  if (input.due && new Date(input.due) < now && (isNew || input.due !== previousDue)) {
    fields.due = MESSAGES.dueInPast;
  }

  const cookies =
    input.cookies === "" || input.cookies === null || input.cookies === undefined ? TASK_COOKIES.default : Number(input.cookies);
  if (!Number.isInteger(cookies) || cookies < TASK_COOKIES.min || cookies > TASK_COOKIES.max) {
    fields.cookies = MESSAGES.cookies;
  }

  return { fields, value: { title, description, due: input.due || null, cookies } };
}

/* ---------- placeholder (demo and tests) ---------- */

function context(user, householdId) {
  const resident = residentOf(user);
  const data = load();
  const household = data.households.find((item) => item.id === householdId);

  if (!household || !isMember(household, resident.id)) {
    throw new ApiError("not-found", "Household not found.", 404);
  }

  const me = household.members.find((member) => member.id === resident.id);
  const isManager = me.roles.includes("manager");
  return { data, household, me, isManager };
}

function findTask(household, taskId) {
  const found = household.tasks.find((item) => item.id === taskId);
  if (!found) {
    throw new ApiError("not-found", MESSAGES.notFound, 404);
  }
  return found;
}

function requireResponsible(task, me, message) {
  if (task.managerId !== me.id) {
    throw new ApiError("not-responsible", message, 403);
  }
}

function invalid(fields) {
  return new ApiError("invalid", fields.title || fields.cookies || fields.description || fields.due, 400, fields);
}

function publicTask(item) {
  return { ...item };
}

/* ---------- API ---------- */

/** Task list of a household with its housemates and whether the resident is a manager (HK-72 / HK-73). */
export async function listTasks(user, householdId) {
  if (!USE_PLACEHOLDER_API) {
    return request(user, "GET", tasksPath(householdId));
  }
  const { household, me, isManager } = context(user, householdId);
  return delay({
    tasks: household.tasks.map(publicTask),
    members: household.members.map(({ id, name, roles }) => ({ id, name, roles })),
    me: { id: me.id, name: me.name },
    isManager
  });
}

/** US5: a manager creates a TO DO task and becomes its responsible manager. */
export async function createTask(user, householdId, input) {
  const { fields, value } = validateTask(input);
  if (Object.keys(fields).length > 0) {
    throw invalid(fields);
  }
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", tasksPath(householdId), { ...value, assigneeId: input.assigneeId || null })).task;
  }

  const { data, household, me, isManager } = context(user, householdId);
  if (!isManager) {
    throw new ApiError("not-manager", MESSAGES.notManager, 403);
  }

  let assignee = null;
  if (input.assigneeId) {
    assignee = household.members.find((member) => member.id === input.assigneeId);
    if (!assignee) {
      await delay();
      throw new ApiError("not-housemate", MESSAGES.notHousemate, 400);
    }
  }

  const created = {
    id: `task-${Date.now().toString(36)}`,
    ...value,
    assigneeId: assignee?.id || null,
    assigneeName: assignee?.name || null,
    managerId: me.id,
    managerName: me.name,
    status: assignee ? "assigned" : "available"
  };
  household.tasks.push(created);
  save(data);
  return delay(publicTask(created));
}

/** US6: the responsible manager edits name, description, due date and cookies of a TO DO task. */
export async function updateTask(user, householdId, taskId, input) {
  if (!USE_PLACEHOLDER_API) {
    // The form already ran validateTask (with the previous due date); the backend checks again.
    const { title, description, due, cookies } = input;
    return (await request(user, "PATCH", taskPath(householdId, taskId), { title, description, due: due || null, cookies })).task;
  }

  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);
  requireResponsible(current, me, MESSAGES.onlyResponsibleEdits);
  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoEdit, 409);
  }

  const { fields, value } = validateTask(input, { isNew: false, previousDue: current.due });
  if (Object.keys(fields).length > 0) {
    await delay();
    throw invalid(fields);
  }

  Object.assign(current, value);
  save(data);
  return delay(publicTask(current));
}

/** US6 4a–4b: the responsible manager deletes a TO DO task. */
export async function deleteTask(user, householdId, taskId) {
  if (!USE_PLACEHOLDER_API) {
    await request(user, "DELETE", taskPath(householdId, taskId));
    return true;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);
  requireResponsible(current, me, MESSAGES.onlyResponsibleEdits);
  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoDelete, 409);
  }

  household.tasks = household.tasks.filter((item) => item.id !== taskId);
  save(data);
  return delay(true);
}

/** US6 4c–4e: the responsible manager hands the task over to another manager of the household. */
export async function handOverTask(user, householdId, taskId, managerId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", `${taskPath(householdId, taskId)}/hand-over`, { managerId })).task;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);
  requireResponsible(current, me, MESSAGES.onlyResponsibleEdits);

  const manager = household.members.find((member) => member.id === managerId);
  if (!manager || !manager.roles.includes("manager")) {
    throw new ApiError("not-manager", MESSAGES.handOverToManager, 400);
  }
  Object.assign(current, { managerId: manager.id, managerName: manager.name });
  save(data);
  return delay(publicTask(current));
}

/** US7: the responsible manager assigns or reassigns a TO DO task (also to themselves). */
export async function assignTask(user, householdId, taskId, assigneeId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", `${taskPath(householdId, taskId)}/assign`, { assigneeId })).task;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);
  requireResponsible(current, me, MESSAGES.onlyResponsibleAssigns);
  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoAssign, 409);
  }

  const assignee = household.members.find((member) => member.id === assigneeId);
  if (!assignee) {
    throw new ApiError("not-housemate", MESSAGES.notHousemate, 400);
  }

  Object.assign(current, { assigneeId: assignee.id, assigneeName: assignee.name, status: "assigned" });
  save(data);
  return delay(publicTask(current));
}

/** US8: any housemate picks up a TO DO task without an assignee. */
export async function pickUpTask(user, householdId, taskId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", `${taskPath(householdId, taskId)}/pick-up`)).task;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status !== "available") {
    await delay();
    throw new ApiError("already-assigned", MESSAGES.alreadyAssigned, 409);
  }

  Object.assign(current, { assigneeId: me.id, assigneeName: me.name, status: "assigned" });
  save(data);
  return delay(publicTask(current));
}

/** US8 4a–4b: the assignee gives their task back; it stays TO DO without an assignee. */
export async function giveBackTask(user, householdId, taskId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", `${taskPath(householdId, taskId)}/give-back`)).task;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status !== "assigned" || current.assigneeId !== me.id) {
    throw new ApiError("not-assignee", MESSAGES.onlyAssigneeGivesBack, 403);
  }

  Object.assign(current, { assigneeId: null, assigneeName: null, status: "available" });
  save(data);
  return delay(publicTask(current));
}

/**
 * US9: only the assignee marks the task as done. The cookies are credited when there is no
 * due date or it is done on or before the due date. Returns the task and the credited cookies.
 */
export async function markTaskDone(user, householdId, taskId, now = new Date()) {
  if (!USE_PLACEHOLDER_API) {
    return request(user, "POST", `${taskPath(householdId, taskId)}/done`);
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.alreadyDone, 409);
  }
  if (!current.assigneeId) {
    throw new ApiError("no-assignee", MESSAGES.assignFirst, 400);
  }
  if (current.assigneeId !== me.id) {
    throw new ApiError("not-assignee", MESSAGES.onlyAssigneeDone, 403);
  }

  const onTime = !current.due || now <= new Date(current.due);
  const credited = onTime ? current.cookies || 0 : 0;

  me.cookies += credited;
  Object.assign(current, { status: "done", creditedCookies: credited, completedAt: now.toISOString(), markedById: me.id });
  household.completed = household.completed || [];
  household.completed.push({
    id: current.id,
    title: current.title,
    memberId: me.id,
    markedById: me.id,
    completedAt: now.toISOString(),
    cookies: credited
  });
  save(data);
  return delay({ task: publicTask(current), credited });
}

/** US9 4a–4c: the responsible manager returns a DONE task; the assignee stays, its cookies no longer count. */
export async function returnTask(user, householdId, taskId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", `${taskPath(householdId, taskId)}/return`)).task;
  }
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);
  requireResponsible(current, me, MESSAGES.onlyResponsibleReturns);
  if (current.status !== "done") {
    return delay(publicTask(current));
  }

  const assignee = household.members.find((member) => member.id === current.assigneeId);
  if (assignee) {
    assignee.cookies = Math.max(0, assignee.cookies - (current.creditedCookies || 0));
  }
  household.completed = (household.completed || []).filter((item) => item.id !== current.id);
  Object.assign(current, {
    status: current.assigneeId ? "assigned" : "available",
    creditedCookies: 0,
    completedAt: null,
    markedById: null
  });
  save(data);
  return delay(publicTask(current));
}
