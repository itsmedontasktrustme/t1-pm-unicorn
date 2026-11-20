/*
 * Invitations (US2 / US3 as updated on 20.11., HK-49 / HK-268).
 * - One invitation code per household, valid 1–14 days (7 by default); a new code replaces the old one.
 * - A resident who enters a valid code joins as an Invitee: they see "Pending invitation",
 *   not the household. The owner accepts (→ housemate) or rejects (→ removed) them.
 */
const crypto = require("crypto");
const database = require("../database");
const { ApiError, badRequest, conflict, forbidden, notFound } = require("./errors");
const { findMembership, requireMembership } = require("./households");

const DEFAULT_VALID_DAYS = 7;
const MIN_VALID_DAYS = 1;
const MAX_VALID_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const MESSAGES = {
  onlyOwner: "Only the owner can invite residents to this household",
  validity: "An invitation must be valid for 1 to 14 days",
  invalid: "This invitation is invalid or has expired. Ask the owner for a new one.",
  alreadyHousemate: "You are already a housemate of this household",
  inviteeNotFound: "This resident is not waiting for your answer anymore."
};

function randomCode() {
  const pick = (length) => Array.from({ length }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
  return `HK-${pick(4)}-${pick(2)}`;
}

/** "hk-7k2m-5p", " HK7K2M5P " → "HK-7K2M-5P". */
function normalizeCode(code) {
  const raw = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("HK") ? raw.slice(2) : raw;
  return body.length === 6 ? `HK-${body.slice(0, 4)}-${body.slice(4)}` : String(code || "").trim().toUpperCase();
}

async function requireOwner(householdId, residentId) {
  const membership = await requireMembership(householdId, residentId);
  if (!membership.roles.includes("owner")) {
    throw forbidden(MESSAGES.onlyOwner, "not-owner");
  }
  return membership;
}

const toInvitation = (row) => ({ code: row.code, expiresAt: new Date(row.expiration_dt).toISOString() });

async function listInvitees(householdId) {
  const rows = await database("housemate as h")
    .join("resident as r", "r.id", "h.resident_id")
    .where({ "h.household_id": householdId, "h.status": "invitee" })
    .orderBy("h.create_dt")
    .select("r.id", "r.name", "h.create_dt");
  return rows.map((row) => ({ id: String(row.id), name: row.name, joinedAt: new Date(row.create_dt).toISOString() }));
}

/** Owner: the current (still valid) code and the residents waiting for an answer. */
async function getInvitationState(householdId, residentId) {
  const { householdId: id } = await requireOwner(householdId, residentId);
  const row = await database("invitation").where({ household_id: id }).where("expiration_dt", ">", new Date()).first();
  return { invitation: row ? toInvitation(row) : null, invitees: await listInvitees(id) };
}

/** US2 steps 3–8: new code for the household; the previous one stops being valid. */
async function createInvitation(householdId, residentId, validDays = DEFAULT_VALID_DAYS) {
  const { householdId: id } = await requireOwner(householdId, residentId);
  const days = validDays === undefined || validDays === null || validDays === "" ? DEFAULT_VALID_DAYS : Number(validDays);
  if (!Number.isInteger(days) || days < MIN_VALID_DAYS || days > MAX_VALID_DAYS) {
    throw badRequest(MESSAGES.validity, "invalid", { validDays: MESSAGES.validity });
  }

  const expiration = new Date(Date.now() + days * DAY_MS);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    try {
      await database.transaction(async (trx) => {
        await trx("invitation").where({ household_id: id }).delete();
        await trx("invitation").insert({ household_id: id, code, created_by: residentId, expiration_dt: expiration });
      });
      return { code, expiresAt: expiration.toISOString() };
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") {
        throw error;
      }
    }
  }
  throw new ApiError(500, "server", "Could not create a unique invitation code.");
}

async function findValidInvitation(code) {
  const row = await database("invitation as i")
    .join("household as hh", "hh.id", "i.household_id")
    .leftJoin("resident as r", "r.id", "i.created_by")
    .where("i.code", normalizeCode(code))
    .where("i.expiration_dt", ">", new Date())
    .select("i.*", "hh.name as household_name", "r.name as invited_by")
    .first();
  if (!row) {
    throw notFound(MESSAGES.invalid, "invitation-invalid");
  }
  return row;
}

/** US3 step 2: what the code is for, shown before joining. */
async function previewInvitation(code) {
  const row = await findValidInvitation(code);
  const [{ count }] = await database("housemate")
    .where({ household_id: row.household_id, status: "member" })
    .count({ count: "*" });
  return {
    code: row.code,
    householdId: String(row.household_id),
    householdName: row.household_name,
    invitedBy: row.invited_by || "the owner",
    memberCount: Number(count),
    expiresAt: new Date(row.expiration_dt).toISOString()
  };
}

/** US3 steps 2–4: join with a code → Invitee. */
async function joinWithCode(code, residentId) {
  const row = await findValidInvitation(code);
  const membership = await findMembership(row.household_id, residentId);
  if (membership?.status === "member") {
    throw conflict(MESSAGES.alreadyHousemate, "already-housemate");
  }
  if (!membership) {
    try {
      await database("housemate").insert({ household_id: row.household_id, resident_id: residentId, status: "invitee" });
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY") {
        throw error;
      }
    }
  }
  return { householdId: String(row.household_id), householdName: row.household_name, status: "invitee" };
}

/** US3 step 4: households where the resident waits for the owner's answer. */
async function listPending(residentId) {
  const rows = await database("housemate as h")
    .join("household as hh", "hh.id", "h.household_id")
    .where({ "h.resident_id": residentId, "h.status": "invitee" })
    .orderBy("h.create_dt")
    .select("hh.id", "hh.name", "h.create_dt");
  return rows.map((row) => ({ householdId: String(row.id), householdName: row.name, joinedAt: new Date(row.create_dt).toISOString() }));
}

/** US3 steps 6–7 / 6a–6b: the owner accepts (→ housemate) or rejects (→ removed) an invitee. */
async function answerInvitee(householdId, inviteeId, answer, residentId) {
  const { householdId: id } = await requireOwner(householdId, residentId);
  if (!["accept", "reject"].includes(answer)) {
    throw badRequest("Answer with accept or reject.");
  }
  const target = Number.isInteger(Number(inviteeId)) ? await findMembership(id, Number(inviteeId)) : null;
  if (!target || target.status !== "invitee") {
    throw notFound(MESSAGES.inviteeNotFound);
  }
  if (answer === "accept") {
    await database("housemate").where({ id: target.housemateId }).update({ status: "member" });
  } else {
    await database("housemate").where({ id: target.housemateId }).delete();
  }
  return getInvitationState(id, residentId);
}

module.exports = {
  MESSAGES,
  normalizeCode,
  getInvitationState,
  createInvitation,
  previewInvitation,
  joinWithCode,
  listPending,
  answerInvitee
};
