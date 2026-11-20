/*
 * Task API (US5–US9).
 *
 * TEMPORARY PLACEHOLDER — there is no backend for tasks yet. Data lives in the same
 * browser storage as api/households.js. Replace the bodies with fetch() calls when the
 * endpoints exist (Web-Backend Connection HK-73, HK-76, HK-79, HK-82, HK-85).
 * Keep the function names, arguments and return shapes so the screens do not change.
 *
 * Rules and messages follow the business rules HK-218 (BR-TASK-…, BR-CK-…) and the
 * Permission Matrix. The screens never offer an action the resident is not allowed to do,
 * so most of these errors only show up when someone else changed the task meanwhile.
 */
import { ApiError, placeholderStore } from "./households";

const { load, save, delay, residentOf, isMember } = placeholderStore;

export const TASK_NAME_MAX = 100;
export const TASK_DESCRIPTION_MAX = 2000;

export const MESSAGES = {
  notManager: "Only a manager can do this.",
  notHousemate: "A task can only be assigned to a housemate of this household",
  doneNoEdit: "A task with the status Done cannot be edited",
  doneNoDelete: "A task with the status Done cannot be deleted",
  doneNoAssign: "A task with the status Done cannot be assigned",
  onlyAvailable: "Only a task with the status Available can be picked up",
  onlyAssigneeOrManager: "Only the assignee or a manager can mark this task as done",
  onlyManagerReturns: "Only a manager can return a completed task",
  onlyAssigneeGivesBack: "Only the assignee can give this task back.",
  alreadyDone: "This task is already done.",
  notFound: "This task no longer exists."
};

function context(user, householdId) {
  const resident = residentOf(user);
  const data = load();
  const household = data.households.find((item) => item.id === householdId);

  if (!household || !isMember(household, resident.id)) {
    throw new ApiError("not-found", "Household not found.");
  }

  const me = household.members.find((member) => member.id === resident.id);
  const isManager = me.roles.includes("manager") || me.roles.includes("owner");
  return { data, household, me, isManager };
}

function findTask(household, taskId) {
  const found = household.tasks.find((item) => item.id === taskId);
  if (!found) {
    throw new ApiError("not-found", MESSAGES.notFound);
  }
  return found;
}

function requireManager(isManager) {
  if (!isManager) {
    throw new ApiError("not-manager", MESSAGES.notManager);
  }
}

/** Validates the task form (US5 7a, BR-TASK-02, BR-TASK-07, HK-202 TC-US5-01/06/11). */
export function validateTask(input, { now = new Date(), isNew = true, previousDue = null } = {}) {
  const fields = {};
  const title = (input.title || "").trim();
  const description = (input.description || "").trim();

  if (!title) {
    fields.title = "Enter a task name.";
  } else if (title.length > TASK_NAME_MAX) {
    fields.title = `Use at most ${TASK_NAME_MAX} characters.`;
  }

  if (description.length > TASK_DESCRIPTION_MAX) {
    fields.description = `Use at most ${TASK_DESCRIPTION_MAX} characters.`;
  }

  // A past due date is rejected for new tasks; an unchanged one may stay when editing.
  if (input.due && new Date(input.due) < now && (isNew || input.due !== previousDue)) {
    fields.due = "Due date can’t be in the past.";
  }

  const cookies = input.cookies === "" || input.cookies === null || input.cookies === undefined ? 0 : Number(input.cookies);
  if (!Number.isInteger(cookies) || cookies < 0) {
    fields.cookies = "Enter a whole number, 0 or more.";
  }

  return { fields, value: { title, description, due: input.due || null, cookies } };
}

function invalid(fields) {
  const error = new ApiError("invalid", "Please fix the highlighted fields.");
  error.fields = fields;
  return error;
}

function publicTask(item) {
  return { ...item };
}

/** Task list of a household with its housemates and whether the resident is a manager (HK-72). */
export async function listTasks(user, householdId) {
  const { household, me, isManager } = context(user, householdId);
  return delay({
    tasks: household.tasks.map(publicTask),
    members: household.members.map(({ id, name, roles }) => ({ id, name, roles })),
    me: { id: me.id, name: me.name },
    isManager
  });
}

/** US5: create a task. Without an assignee it is Available, with one it is Assigned. */
export async function createTask(user, householdId, input) {
  const { data, household, isManager } = context(user, householdId);
  requireManager(isManager);

  const { fields, value } = validateTask(input);
  if (Object.keys(fields).length > 0) {
    await delay();
    throw invalid(fields);
  }

  let assignee = null;
  if (input.assigneeId) {
    assignee = household.members.find((member) => member.id === input.assigneeId);
    if (!assignee) {
      await delay();
      throw new ApiError("not-housemate", MESSAGES.notHousemate);
    }
  }

  const created = {
    id: `task-${Date.now().toString(36)}`,
    ...value,
    assigneeId: assignee?.id || null,
    assigneeName: assignee?.name || null,
    status: assignee ? "assigned" : "available"
  };
  household.tasks.push(created);
  save(data);
  return delay(publicTask(created));
}

/** US6: edit name, description, due date and cookies of a task that is not Done. */
export async function updateTask(user, householdId, taskId, input) {
  const { data, household, isManager } = context(user, householdId);
  requireManager(isManager);
  const current = findTask(household, taskId);

  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoEdit);
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

/** US6 / BR-TASK-06: a manager deletes a task that is not Done. */
export async function deleteTask(user, householdId, taskId) {
  const { data, household, isManager } = context(user, householdId);
  requireManager(isManager);
  const current = findTask(household, taskId);

  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoDelete);
  }

  household.tasks = household.tasks.filter((item) => item.id !== taskId);
  save(data);
  return delay(true);
}

/** US7: a manager assigns or reassigns a task to a housemate (also to themselves). */
export async function assignTask(user, householdId, taskId, assigneeId) {
  const { data, household, isManager } = context(user, householdId);
  requireManager(isManager);
  const current = findTask(household, taskId);

  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.doneNoAssign);
  }

  const assignee = household.members.find((member) => member.id === assigneeId);
  if (!assignee) {
    throw new ApiError("not-housemate", MESSAGES.notHousemate);
  }

  Object.assign(current, { assigneeId: assignee.id, assigneeName: assignee.name, status: "assigned" });
  save(data);
  return delay(publicTask(current));
}

/** US8: any housemate picks up an Available task. */
export async function pickUpTask(user, householdId, taskId) {
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status !== "available") {
    await delay();
    throw new ApiError("not-available", MESSAGES.onlyAvailable);
  }

  Object.assign(current, { assigneeId: me.id, assigneeName: me.name, status: "assigned" });
  save(data);
  return delay(publicTask(current));
}

/** US8 4a / Q&A 3: the assignee gives their task back; it becomes Available. */
export async function giveBackTask(user, householdId, taskId) {
  const { data, household, me } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status !== "assigned" || current.assigneeId !== me.id) {
    throw new ApiError("not-assignee", MESSAGES.onlyAssigneeGivesBack);
  }

  Object.assign(current, { assigneeId: null, assigneeName: null, status: "available" });
  save(data);
  return delay(publicTask(current));
}

/**
 * US9: the assignee or a manager marks the task as done.
 * Cookies go to the assignee, only if done by the due date (BR-CK-02); none without an assignee (BR-CK-03).
 * Returns the task and the number of cookies credited.
 */
export async function markTaskDone(user, householdId, taskId, now = new Date()) {
  const { data, household, me, isManager } = context(user, householdId);
  const current = findTask(household, taskId);

  if (current.status === "done") {
    throw new ApiError("done", MESSAGES.alreadyDone);
  }
  if (current.assigneeId !== me.id && !isManager) {
    throw new ApiError("not-allowed", MESSAGES.onlyAssigneeOrManager);
  }

  const assignee = household.members.find((member) => member.id === current.assigneeId);
  const onTime = !current.due || now <= new Date(current.due);
  const credited = assignee && onTime ? current.cookies || 0 : 0;

  if (assignee) {
    assignee.cookies += credited;
  }
  Object.assign(current, { status: "done", creditedCookies: credited, completedAt: now.toISOString(), markedById: me.id });
  household.completed = household.completed || [];
  household.completed.push({
    id: current.id,
    title: current.title,
    memberId: current.assigneeId,
    markedById: me.id,
    completedAt: now.toISOString(),
    cookies: credited
  });
  save(data);
  return delay({ task: publicTask(current), credited });
}

/** US9 4a / BR-TASK-17: a manager returns a Done task; its cookies no longer count. */
export async function returnTask(user, householdId, taskId) {
  const { data, household, isManager } = context(user, householdId);
  const current = findTask(household, taskId);

  if (!isManager) {
    throw new ApiError("not-manager", MESSAGES.onlyManagerReturns);
  }
  if (current.status !== "done") {
    return delay(publicTask(current));
  }

  const assignee = household.members.find((member) => member.id === current.assigneeId);
  if (assignee) {
    assignee.cookies = Math.max(0, assignee.cookies - (current.creditedCookies || 0));
  }
  household.completed = (household.completed || []).filter((item) => item.id !== current.id);
  Object.assign(current, { status: current.assigneeId ? "assigned" : "available", creditedCookies: 0, completedAt: null, markedById: null });
  save(data);
  return delay(publicTask(current));
}
