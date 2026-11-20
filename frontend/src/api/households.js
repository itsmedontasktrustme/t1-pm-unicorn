/*
 * Household API.
 *
 * Calls the backend (/api, see api/client.js). Without a Clerk key (local demo) and in unit tests
 * the same functions work on placeholder data in the browser (localStorage), see USE_PLACEHOLDER_API.
 * Connected to the backend:
 *   HK-64 Create household · HK-61 Household view · HK-67 Resident / housemate profile
 *   HK-52 Roles · HK-49 / HK-268 Invitations (code, Invitee, accept / reject)
 * Still on the placeholder only (next steps):
 *   HK-88 / HK-91 history
 *
 * Shapes:
 *   Household  { id, name, description, meId, members: Member[], tasks: Task[] }
 *              meId = id of the signed-in resident among the members (compare with it, not with the Clerk id)
 *   Member     { id, name, roles: ("owner"|"manager"|"housemate")[], cookies }
 *   Task       { id, title, description, assigneeId|null, assigneeName|null, managerId, managerName,
 *                due: ISO date-time|null, cookies, status: "available"|"assigned"|"done", creditedCookies,
 *                completedAt, markedById }  — see api/tasks.js
 *   Invitation { code, householdId, householdName, invitedBy, memberCount, expiresAt }  — preview of a code (US3)
 *   InvitationState { invitation: { code, expiresAt }|null, invitees: { id, name, joinedAt }[] }  — owner (US2/US3)
 *   Pending    { householdId, householdName, joinedAt }  — resident waits for the owner (Invitee)
 *   Membership { id, name, roles, cookies }  — one per household of the resident
 *   CompletedTask { id, title, memberId, markedById, completedAt: ISO, cookies }
 */

import { ApiError, request, USE_PLACEHOLDER_API } from "./client";

export { ApiError };

const STORAGE_KEY = "homekeeper.placeholder.households.v7";
// Simulated network latency so loading states are visible; none in tests.
const LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 350;
const INVITATION_VALID_DAYS = 7;


function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// Due date at a fixed time of day, `days` from today (negative = in the past).
function dueAt(days, hours, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function task(id, title, assigneeId, assigneeName, due, cookies, description = "") {
  return { id, title, description, assigneeId, assigneeName, due, cookies, status: assigneeId ? "assigned" : "available" };
}

// Completed demo tasks also appear in the task list with the status Done (Done filter, HK-72).
function withDoneTasks(data) {
  data.households.forEach((household) => {
    household.completed.forEach((item) => {
      const assignee = household.members.find((member) => member.id === item.memberId);
      household.tasks.push({
        id: item.id,
        title: item.title,
        description: "",
        assigneeId: item.memberId,
        assigneeName: assignee?.name || null,
        due: null,
        cookies: item.cookies,
        status: "done",
        creditedCookies: item.cookies,
        completedAt: item.completedAt,
        markedById: item.markedById
      });
    });
  });
  return data;
}

// Every task has a responsible manager (US5 8): the household owner, unless named in `managers`.
function withManagers(data, managers) {
  data.households.forEach((household) => {
    const owner = household.members.find((member) => member.roles.includes("owner"));
    household.tasks.forEach((item) => {
      const manager = household.members.find((member) => member.id === managers[item.id]) || owner;
      Object.assign(item, { managerId: manager.id, managerName: manager.name });
    });
  });
  return data;
}

function demoData() {
  // Ron is responsible for two Gryffindor tasks, so Harry (owner) also sees tasks he cannot change.
  return withManagers(withDoneTasks({
    households: [
      {
        id: "hh-private-drive",
        name: "Private Drive No. 4",
        members: [
          { id: "demo-vernon", name: "Vernon D.", roles: ["owner", "manager"], cookies: 120 },
          { id: "demo-petunia", name: "Petunia D.", roles: ["manager"], cookies: 95 },
          { id: "demo-dudley", name: "Dudley D.", roles: ["housemate"], cookies: 3 },
          // Development demo resident (see logic/useResident.js) is a housemate here.
          { id: "dev-demo-resident", name: "Harry Potter", roles: ["housemate"], cookies: 64 }
        ],
        tasks: [
          task("t1", "Make roast for dinner", "demo-petunia", "Petunia D.", dueAt(0, 23, 30), 2, "Don’t forget the dessert."),
          task("t2", "Clean the toy room", null, null, dueAt(1, 20), 4, "Broken toys go in the box by the door."),
          task("t3", "Vacuum the 1st floor", "dev-demo-resident", "Harry Potter", dueAt(3, 20), 2, "Under the beds too, please."),
          task("t4", "Repaint the shed", null, null, dueAt(6, 20), 6)
        ],
        completed: [
          { id: "c1", title: "Water the plants", memberId: "demo-petunia", markedById: "demo-petunia", completedAt: daysFromNow(-1), cookies: 2 },
          { id: "c2", title: "Clean the kitchen", memberId: "demo-petunia", markedById: "demo-vernon", completedAt: daysFromNow(-2), cookies: 4 },
          { id: "c3", title: "Take out the bins", memberId: "demo-petunia", markedById: "demo-petunia", completedAt: daysFromNow(-5), cookies: 1 },
          { id: "c4", title: "Mow the lawn", memberId: "dev-demo-resident", markedById: "dev-demo-resident", completedAt: daysFromNow(-3), cookies: 5 },
          { id: "c5", title: "Wash the car", memberId: "demo-dudley", markedById: "demo-petunia", completedAt: daysFromNow(-12), cookies: 3 }
        ]
      },
      {
        // The demo resident is the owner here, to try owner-only screens (invitations, roles).
        id: "hh-gryffindor",
        name: "Gryffindor Tower",
        members: [
          { id: "dev-demo-resident", name: "Harry Potter", roles: ["owner", "manager"], cookies: 40 },
          { id: "demo-ron", name: "Ron W.", roles: ["manager"], cookies: 22 },
          { id: "demo-hermione", name: "Hermione G.", roles: ["housemate"], cookies: 0 }
        ],
        tasks: [
          task("g1", "Tidy the common room", null, null, dueAt(2, 20), 3, "Put the chess pieces away and fold the blankets by the fire."),
          task("g2", "Feed the owls", "demo-ron", "Ron W.", dueAt(1, 20), 2, "Owl treats are in the blue tin on the windowsill."),
          task("g3", "Return library books", "dev-demo-resident", "Harry Potter", dueAt(0, 23, 30), 4, "Madam Pince wants them back before the library closes."),
          task("g4", "Scrub the cauldrons", "demo-ron", "Ron W.", dueAt(-1, 18), 5),
          task("g5", "Water the Mandrakes", null, null, null, 1, "Earmuffs on!")
        ],
        // Used the code and waits for the owner (US3 step 5).
        invitees: [{ id: "demo-neville", name: "Neville L.", joinedAt: daysFromNow(-1) }],
        completed: [
          { id: "gc1", title: "Sort the library books", memberId: "demo-ron", markedById: "demo-ron", completedAt: daysFromNow(-1), cookies: 3 },
          { id: "gc2", title: "Sweep the common room", memberId: "dev-demo-resident", markedById: "demo-ron", completedAt: daysFromNow(-6), cookies: 3 }
        ]
      },
      {
        // The demo resident is not a member here: join it with the code HK-B7RW-3X (US3).
        id: "hh-burrow",
        name: "The Burrow",
        members: [
          { id: "demo-molly", name: "Molly W.", roles: ["owner", "manager"], cookies: 12 },
          { id: "demo-arthur", name: "Arthur W.", roles: ["manager"], cookies: 7 }
        ],
        tasks: [],
        completed: []
      }
    ],
    invitations: [
      // Demo codes to try the join flow: one valid, one expired (US3 3a).
      { code: "HK-7K2M-5P", householdId: "hh-private-drive", invitedBy: "Vernon D.", expiresAt: daysFromNow(INVITATION_VALID_DAYS) },
      { code: "HK-4F9Q-2B", householdId: "hh-private-drive", invitedBy: "Vernon D.", expiresAt: daysFromNow(-2) },
      { code: "HK-Q3T8-1X", householdId: "hh-gryffindor", invitedBy: "Harry Potter", expiresAt: daysFromNow(2) },
      { code: "HK-B7RW-3X", householdId: "hh-burrow", invitedBy: "Molly W.", expiresAt: daysFromNow(5) }
    ]
  }), { g2: "demo-ron", g4: "demo-ron", gc1: "demo-ron" });
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    // Storage blocked or corrupted — fall back to fresh demo data.
  }
  return demoData();
}

function save(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore: data then lives only until reload.
  }
}

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function residentOf(user) {
  return {
    id: user?.id || "anonymous",
    name: user?.fullName || user?.firstName || "You"
  };
}

function isMember(household, residentId) {
  return household.members.some((member) => member.id === residentId);
}

/** Households the resident belongs to (a resident can be in several). */
export async function listMyHouseholds(user) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "GET", "/households")).households;
  }
  const { id } = residentOf(user);
  const data = load();
  return delay(data.households.filter((household) => isMember(household, id)).map(({ id: hid, name }) => ({ id: hid, name })));
}

export const HOUSEHOLD_NAME_MAX = 20;
export const HOUSEHOLD_DESCRIPTION_MAX = 255;
export const HOUSEHOLD_MESSAGES = {
  name: "Please enter a household name (max 20 characters)",
  description: "The description can have at most 255 characters"
};

/** US1 5a / 5b: texts per field, empty object when the household can be created. */
export function validateHousehold(name, description = "") {
  const fields = {};
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.length > HOUSEHOLD_NAME_MAX) {
    fields.name = HOUSEHOLD_MESSAGES.name;
  }
  if ((description || "").trim().length > HOUSEHOLD_DESCRIPTION_MAX) {
    fields.description = HOUSEHOLD_MESSAGES.description;
  }
  return fields;
}

/** US1: create a household; the creator becomes owner and manager. */
export async function createHousehold(user, name, description = "") {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", "/households", { name, description })).household;
  }

  const fields = validateHousehold(name, description);
  if (Object.keys(fields).length > 0) {
    throw new ApiError("invalid", fields.name || fields.description, 400, fields);
  }
  const trimmed = name.trim();

  const resident = residentOf(user);
  const data = load();
  const household = {
    id: `hh-${Date.now().toString(36)}`,
    name: trimmed,
    description: (description || "").trim(),
    members: [{ id: resident.id, name: resident.name, roles: ["owner", "manager"], cookies: 0 }],
    tasks: []
  };
  data.households.push(household);
  save(data);
  return delay({ id: household.id, name: household.name });
}

export const INVITATION_MESSAGES = {
  onlyOwner: "Only the owner can invite residents to this household",
  validity: "An invitation must be valid for 1 to 14 days",
  invalid: "This invitation is invalid or has expired. Ask the owner for a new one.",
  alreadyHousemate: "You are already a housemate of this household"
};
export const INVITATION_DAYS = { min: 1, max: 14, default: INVITATION_VALID_DAYS };

/** "hk-7k2m-5p", " HK7K2M5P " → "HK-7K2M-5P". */
function normalizeCode(code) {
  const raw = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("HK") ? raw.slice(2) : raw;
  return body.length === 6 ? `HK-${body.slice(0, 4)}-${body.slice(4)}` : String(code || "").trim().toUpperCase();
}

function findValidInvitation(data, code) {
  const normalized = normalizeCode(code);
  const invitation = data.invitations.find((item) => item.code === normalized);
  const household = invitation && data.households.find((item) => item.id === invitation.householdId);
  if (!invitation || !household || new Date(invitation.expiresAt) < new Date()) {
    throw new ApiError("invitation-invalid", INVITATION_MESSAGES.invalid, 404);
  }
  return { invitation, household };
}

/** US3 step 2: what the code is for. Throws "invitation-invalid" (US3 2a). */
export async function getInvitation(user, code) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "GET", `/invitations/${encodeURIComponent(normalizeCode(code))}`)).invitation;
  }
  let found;
  try {
    found = findValidInvitation(load(), code);
  } catch (error) {
    await delay();
    throw error;
  }
  const { invitation, household } = found;
  return delay({
    code: invitation.code,
    householdId: household.id,
    householdName: household.name,
    invitedBy: invitation.invitedBy,
    memberCount: household.members.length,
    expiresAt: invitation.expiresAt
  });
}

/** US3 steps 2–4: join with the code; the resident becomes an Invitee and waits for the owner. */
export async function joinWithCode(user, code) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "POST", "/invitations/join", { code: normalizeCode(code) })).pending;
  }
  const resident = residentOf(user);
  const data = load();
  let household;
  try {
    ({ household } = findValidInvitation(data, code));
  } catch (error) {
    await delay();
    throw error;
  }

  if (isMember(household, resident.id)) {
    await delay();
    throw new ApiError("already-housemate", INVITATION_MESSAGES.alreadyHousemate, 409);
  }
  household.invitees = household.invitees || [];
  if (!household.invitees.some((item) => item.id === resident.id)) {
    household.invitees.push({ id: resident.id, name: resident.name, joinedAt: new Date().toISOString() });
    save(data);
  }
  return delay({ householdId: household.id, householdName: household.name, status: "invitee" });
}

/** US3 step 4: households where the resident waits for the owner ("Pending invitation"). */
export async function listPendingInvitations(user) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "GET", "/me/pending")).pending;
  }
  const { id } = residentOf(user);
  return delay(
    load()
      .households.filter((household) => (household.invitees || []).some((item) => item.id === id))
      .map((household) => ({
        householdId: household.id,
        householdName: household.name,
        joinedAt: household.invitees.find((item) => item.id === id).joinedAt
      }))
  );
}

/** Household view (HK-60): household with members and upcoming tasks. */
export async function getHousehold(user, householdId) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "GET", `/households/${encodeURIComponent(householdId)}`)).household;
  }
  const { id } = residentOf(user);
  const household = load().households.find((item) => item.id === householdId);

  if (!household || !isMember(household, id)) {
    await delay();
    throw new ApiError("not-found", "Household not found.");
  }
  return delay({ ...household, meId: id });
}

const ONLY_OWNER_ROLES = "Only the owner can change roles.";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const pick = (length) =>
    Array.from({ length }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `HK-${pick(4)}-${pick(2)}`;
}

function ownerContext(user, householdId, deniedMessage) {
  const { id } = residentOf(user);
  const data = load();
  const household = data.households.find((item) => item.id === householdId);
  const me = household?.members.find((member) => member.id === id);

  if (!household || !me) {
    throw new ApiError("not-found", "Household not found.", 404);
  }
  if (!me.roles.includes("owner")) {
    throw new ApiError("not-owner", deniedMessage, 403);
  }
  return { data, household, me };
}

function invitationState(data, household) {
  const now = new Date();
  const current = data.invitations
    .filter((item) => item.householdId === household.id && new Date(item.expiresAt) > now)
    .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0];
  return {
    invitation: current ? { code: current.code, expiresAt: current.expiresAt } : null,
    invitees: household.invitees || []
  };
}

/** US2 step 8 / US3 step 5: the current code and the residents who used it. Owner only. */
export async function getInvitationState(user, householdId) {
  if (!USE_PLACEHOLDER_API) {
    return request(user, "GET", `/households/${encodeURIComponent(householdId)}/invitation`);
  }
  const { data, household } = ownerContext(user, householdId, INVITATION_MESSAGES.onlyOwner);
  return delay(invitationState(data, household));
}

/** US2 6a: text for the validity field, null when it is fine. */
export function validateValidDays(value) {
  const days = Number(value);
  const valid = String(value).trim() !== "" && Number.isInteger(days) && days >= INVITATION_DAYS.min && days <= INVITATION_DAYS.max;
  return valid ? null : INVITATION_MESSAGES.validity;
}

/** US2 steps 3–8: new code valid for 1–14 days; the previous code stops being valid. Owner only (5a). */
export async function createInvitation(user, householdId, validDays = INVITATION_VALID_DAYS) {
  if (!USE_PLACEHOLDER_API) {
    const path = `/households/${encodeURIComponent(householdId)}/invitation`;
    return (await request(user, "POST", path, { validDays: Number(validDays) })).invitation;
  }
  const { data, me } = ownerContext(user, householdId, INVITATION_MESSAGES.onlyOwner);
  const validityError = validateValidDays(validDays);
  if (validityError) {
    throw new ApiError("invalid", validityError, 400, { validDays: validityError });
  }

  const usedCodes = new Set(data.invitations.map((item) => item.code));
  let code = randomCode();
  while (usedCodes.has(code)) {
    code = randomCode();
  }

  const invitation = { code, householdId, invitedBy: me.name, expiresAt: daysFromNow(Number(validDays)) };
  data.invitations = data.invitations.filter((item) => item.householdId !== householdId).concat(invitation);
  save(data);
  return delay({ code, expiresAt: invitation.expiresAt });
}

/** US3 steps 6–7 / 6a–6b: the owner accepts (→ housemate) or rejects (→ removed) an Invitee. */
export async function answerInvitee(user, householdId, inviteeId, answer) {
  if (!USE_PLACEHOLDER_API) {
    const path = `/households/${encodeURIComponent(householdId)}/invitees/${encodeURIComponent(inviteeId)}/${answer}`;
    return request(user, "POST", path);
  }
  const { data, household } = ownerContext(user, householdId, INVITATION_MESSAGES.onlyOwner);
  const invitee = (household.invitees || []).find((item) => item.id === inviteeId);
  if (!invitee) {
    throw new ApiError("not-found", "This resident is not waiting for your answer anymore.", 404);
  }
  household.invitees = household.invitees.filter((item) => item.id !== inviteeId);
  if (answer === "accept") {
    household.members.push({ id: invitee.id, name: invitee.name, roles: ["housemate"], cookies: 0 });
  }
  save(data);
  return delay(invitationState(data, household));
}

function withRole(roles, role) {
  const next = roles.filter((item) => item !== "housemate");
  return next.includes(role) ? next : [...next, role];
}

function withoutRole(roles, role) {
  const next = roles.filter((item) => item !== role);
  return next.length > 0 ? next : ["housemate"];
}

/**
 * US4: change a housemate's role. Owner only.
 * action: "grant-manager" | "remove-manager" | "hand-over-owner"
 * Rules: the owner is always a manager (6a); there is always exactly one owner (6b);
 * after a hand-over the new owner is also a manager and the previous owner stays a manager;
 * when the manager role is removed, the owner becomes the responsible manager of that housemate's tasks.
 * Returns the updated household.
 */
export async function changeRole(user, householdId, memberId, action) {
  if (!USE_PLACEHOLDER_API) {
    const path = `/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(memberId)}/role`;
    return (await request(user, "POST", path, { action })).household;
  }
  const { data, household, me } = ownerContext(user, householdId, ONLY_OWNER_ROLES);
  const target = household.members.find((member) => member.id === memberId);

  if (!target) {
    throw new ApiError("not-found", "Housemate not found.");
  }

  if (action === "grant-manager") {
    target.roles = withRole(target.roles, "manager");
  } else if (action === "remove-manager") {
    if (target.roles.includes("owner")) {
      throw new ApiError("owner-must-be-manager", "The owner must always be a manager");
    }
    target.roles = withoutRole(target.roles, "manager");
    household.tasks.forEach((item) => {
      if (item.managerId === target.id) {
        item.managerId = me.id;
        item.managerName = me.name;
      }
    });
  } else if (action === "hand-over-owner") {
    if (target.id === me.id) {
      throw new ApiError("hand-over-first", "Hand over the owner role to another housemate first");
    }
    target.roles = ["owner", "manager"];
    me.roles = ["manager"];
  } else {
    throw new ApiError("unknown-action", `Unknown role change: ${action}`);
  }

  save(data);
  return delay({ ...household, meId: me.id });
}

/** Resident profile (HK-66): the resident's role and cookies in each household. */
export async function listMyMemberships(user) {
  if (!USE_PLACEHOLDER_API) {
    return (await request(user, "GET", "/me/households")).memberships;
  }
  const { id } = residentOf(user);
  const memberships = load()
    .households.map((household) => {
      const me = household.members.find((member) => member.id === id);
      return me ? { id: household.id, name: household.name, roles: me.roles, cookies: me.cookies } : null;
    })
    .filter(Boolean);
  return delay(memberships);
}

/** Housemate profile (HK-69): member, current tasks, recently completed, counts and whether the viewer is the owner. */
export async function getMemberProfile(user, householdId, memberId) {
  if (!USE_PLACEHOLDER_API) {
    const path = `/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(memberId)}`;
    return (await request(user, "GET", path)).profile;
  }
  const { id } = residentOf(user);
  const household = load().households.find((item) => item.id === householdId);
  const member = household?.members.find((item) => item.id === memberId);

  if (!household || !isMember(household, id) || !member) {
    await delay();
    throw new ApiError("not-found", "Housemate not found.");
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completed = (household.completed || [])
    .filter((task) => task.memberId === memberId)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const currentTasks = household.tasks
    .filter((task) => task.status === "assigned" && task.assigneeName === member.name)
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  const viewer = household.members.find((item) => item.id === id);

  return delay({
    meId: id,
    member,
    viewerIsOwner: Boolean(viewer?.roles.includes("owner")),
    currentTasks,
    completed: completed.slice(0, 5),
    stats: {
      assignedNow: currentTasks.length,
      done: completed.length,
      doneThisWeek: completed.filter((task) => new Date(task.completedAt).getTime() >= weekAgo).length
    }
  });
}

function nameOf(household, memberId) {
  if (!memberId) {
    return "No assignee";
  }
  return household.members.find((member) => member.id === memberId)?.name || "Former housemate";
}

/**
 * US10 steps 2–5 (HK-90): completed tasks of one household, newest first, with assignee,
 * who marked it done and cookies, plus every housemate's total cookies.
 */
export async function listHouseholdHistory(user, householdId) {
  const { id } = residentOf(user);
  const household = load().households.find((item) => item.id === householdId);

  if (!household || !isMember(household, id)) {
    await delay();
    throw new ApiError("not-found", "Household not found.");
  }

  const completed = (household.completed || [])
    .map((task) => ({
      ...task,
      assigneeName: nameOf(household, task.memberId),
      markedByName: nameOf(household, task.markedById || task.memberId)
    }))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const totals = household.members
    .map((member) => ({ id: member.id, name: member.name, cookies: member.cookies }))
    .sort((a, b) => b.cookies - a.cookies);

  return delay({ householdName: household.name, completed, totals });
}

/** US10 2a–2b (HK-87): the resident's own completed tasks and cookies across all households. */
export async function listMyHistory(user) {
  const { id } = residentOf(user);
  const households = load().households.filter((household) => isMember(household, id));

  const perHousehold = households.map((household) => ({
    id: household.id,
    name: household.name,
    cookies: household.members.find((member) => member.id === id).cookies
  }));

  const completed = households
    .flatMap((household) =>
      (household.completed || [])
        .filter((task) => task.memberId === id)
        .map((task) => ({
          ...task,
          householdName: household.name,
          markedByName: nameOf(household, task.markedById || task.memberId)
        }))
    )
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return delay({
    totalCookies: perHousehold.reduce((sum, item) => sum + item.cookies, 0),
    perHousehold,
    completed
  });
}

/** Shared with api/tasks.js (same placeholder storage). Not part of the future HTTP API. */
export const placeholderStore = { load, save, delay, residentOf, isMember };

/** Development helper: forget all placeholder data. */
export function resetPlaceholderData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}
