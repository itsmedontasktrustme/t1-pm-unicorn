/*
 * Household API.
 *
 * TEMPORARY PLACEHOLDER — there is no backend for households yet.
 * Data lives in the browser (localStorage) so the screens can be built and tested.
 * Replace the bodies with fetch() calls when the endpoints exist:
 *   HK-64 Web-Backend Connection — Create / join household view
 *   HK-61 Web-Backend Connection — Household view
 * Keep the function names, arguments and return shapes so the screens do not change.
 *
 * Shapes:
 *   Household  { id, name, members: Member[], tasks: TaskSummary[] }
 *   Member     { id, name, roles: ("owner"|"manager"|"housemate")[], cookies }
 *   TaskSummary{ id, title, assigneeName|null, due: ISO date, status: "available"|"assigned"|"done" }
 *   Invitation { code, householdId, householdName, invitedBy, memberCount, expiresAt }
 */

const STORAGE_KEY = "homekeeper.placeholder.households.v1";
// Simulated network latency so loading states are visible; none in tests.
const LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 350;
const INVITATION_VALID_DAYS = 7;

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function demoData() {
  return {
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
          { id: "t1", title: "Make roast for dinner", assigneeName: "Petunia D.", due: daysFromNow(0), status: "assigned" },
          { id: "t2", title: "Clean the toy room", assigneeName: null, due: daysFromNow(1), status: "available" },
          { id: "t3", title: "Vacuum the 1st floor", assigneeName: "Harry Potter", due: daysFromNow(3), status: "assigned" },
          { id: "t4", title: "Repaint the shed", assigneeName: null, due: daysFromNow(6), status: "available" }
        ]
      }
    ],
    invitations: [
      // Demo codes to try the join flow: one valid, one expired (US3 3a).
      { code: "HK-7K2M-5P", householdId: "hh-private-drive", invitedBy: "Vernon D.", expiresAt: daysFromNow(INVITATION_VALID_DAYS) },
      { code: "HK-4F9Q-2B", householdId: "hh-private-drive", invitedBy: "Vernon D.", expiresAt: daysFromNow(-2) }
    ]
  };
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
  const { id } = residentOf(user);
  const data = load();
  return delay(data.households.filter((household) => isMember(household, id)).map(({ id: hid, name }) => ({ id: hid, name })));
}

/** US1: create a household; the creator becomes owner and manager. */
export async function createHousehold(user, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new ApiError("name-required", "Please enter a household name.");
  }

  const resident = residentOf(user);
  const data = load();
  const household = {
    id: `hh-${Date.now().toString(36)}`,
    name: trimmed,
    members: [{ id: resident.id, name: resident.name, roles: ["owner", "manager"], cookies: 0 }],
    tasks: []
  };
  data.households.push(household);
  save(data);
  return delay({ id: household.id, name: household.name });
}

/** US3 steps 3–4: look up an invitation by code. Throws "invitation-invalid" (US3 3a). */
export async function getInvitation(code) {
  const normalized = (code || "").trim().toUpperCase();
  const data = load();
  const invitation = data.invitations.find((item) => item.code === normalized);
  const household = invitation && data.households.find((item) => item.id === invitation.householdId);

  if (!invitation || !household || new Date(invitation.expiresAt) < new Date()) {
    await delay();
    throw new ApiError("invitation-invalid", "This invitation is invalid or has expired. Ask the owner for a new one.");
  }

  return delay({
    code: invitation.code,
    householdId: household.id,
    householdName: household.name,
    invitedBy: invitation.invitedBy,
    memberCount: household.members.length,
    expiresAt: invitation.expiresAt
  });
}

/** US3 steps 5–6: accept an invitation; the resident becomes a housemate. */
export async function acceptInvitation(user, code) {
  const invitation = await getInvitation(code);
  const resident = residentOf(user);
  const data = load();
  const household = data.households.find((item) => item.id === invitation.householdId);

  if (!isMember(household, resident.id)) {
    household.members.push({ id: resident.id, name: resident.name, roles: ["housemate"], cookies: 0 });
    save(data);
  }
  return delay({ id: household.id, name: household.name });
}

/** Household view (HK-60): household with members and upcoming tasks. */
export async function getHousehold(user, householdId) {
  const { id } = residentOf(user);
  const household = load().households.find((item) => item.id === householdId);

  if (!household || !isMember(household, id)) {
    await delay();
    throw new ApiError("not-found", "Household not found.");
  }
  return delay(household);
}

/** Development helper: forget all placeholder data. */
export function resetPlaceholderData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}
