/*
 * US4 Managing roles (HK-52). Only the owner changes roles.
 * Actions: "grant-manager" | "remove-manager" | "hand-over-owner".
 * Rules: exactly one owner, the owner is always a manager (6a / 6b);
 * after a hand-over the previous owner stays a manager;
 * when the manager role is removed, the owner becomes the responsible manager of that housemate's tasks.
 */
const database = require("../database");
const { badRequest, forbidden, notFound } = require("./errors");
const { findMembership, requireMembership } = require("./households");

const MESSAGES = {
  onlyOwner: "Only the owner can change roles.",
  ownerIsManager: "The owner must always be a manager",
  handOverFirst: "Hand over the owner role to another housemate first",
  memberNotFound: "Housemate not found.",
  unknownAction: "Choose a role change: grant manager role, remove manager role or hand over owner role."
};

const ACTIONS = ["grant-manager", "remove-manager", "hand-over-owner"];

async function addRole(trx, housemateId, role) {
  const exists = await trx("housemate_role").where({ housemate_id: housemateId, role }).first();
  if (!exists) {
    await trx("housemate_role").insert({ housemate_id: housemateId, role });
  }
}

async function changeRole(householdId, memberId, action, residentId) {
  const viewer = await requireMembership(householdId, residentId);
  if (!viewer.roles.includes("owner")) {
    throw forbidden(MESSAGES.onlyOwner, "not-owner");
  }
  if (!ACTIONS.includes(action)) {
    throw badRequest(MESSAGES.unknownAction);
  }

  const targetId = Number(memberId);
  const target = Number.isInteger(targetId) && targetId > 0 ? await findMembership(viewer.householdId, targetId) : null;
  if (!target || target.status !== "member") {
    throw notFound(MESSAGES.memberNotFound);
  }

  const isSelf = targetId === Number(residentId);
  if (isSelf && action === "remove-manager") {
    throw badRequest(MESSAGES.ownerIsManager, "owner-must-be-manager");
  }
  if (isSelf && action === "hand-over-owner") {
    throw badRequest(MESSAGES.handOverFirst, "hand-over-first");
  }

  await database.transaction(async (trx) => {
    if (action === "grant-manager") {
      await addRole(trx, target.housemateId, "manager");
    } else if (action === "remove-manager") {
      await trx("housemate_role").where({ housemate_id: target.housemateId, role: "manager" }).delete();
      await trx("task")
        .where({ household_id: viewer.householdId, manager_id: targetId })
        .update({ manager_id: Number(residentId) });
    } else {
      await trx("housemate_role").where({ housemate_id: viewer.housemateId, role: "owner" }).delete();
      await addRole(trx, target.housemateId, "owner");
      await addRole(trx, target.housemateId, "manager");
    }
  });
}

module.exports = { changeRole, MESSAGES, ACTIONS };
