/*
 * Residents (US0). A resident is a signed-in Google user; the Clerk user id (token "sub")
 * is stored as auth_user_id. The resident row is created on the first sign-in.
 */
const database = require("../database");
const { requireAuth } = require("./auth");
const { ApiError } = require("./errors");

const NAME_MAX = 50;

function toResident(row) {
  return { id: String(row.id), name: row.name, email: row.email || null };
}

function cleanName(name, email) {
  const value = typeof name === "string" ? name.trim() : "";
  const fallback = typeof email === "string" && email.includes("@") ? email.split("@")[0] : "Resident";
  return (value || fallback).slice(0, NAME_MAX);
}

async function findByAuthUserId(authUserId) {
  return database("resident").where({ auth_user_id: authUserId }).first();
}

/**
 * Finds the resident of the signed-in user or creates it (first sign-in).
 * Name and e-mail come from the Clerk profile and are refreshed on every sign-in.
 */
async function ensureResident(authUserId, { name, email } = {}) {
  const profile = {
    name: cleanName(name, email),
    email: typeof email === "string" && email.trim() ? email.trim().slice(0, 255) : null
  };
  const existing = await findByAuthUserId(authUserId);

  if (existing) {
    if (existing.name !== profile.name || (profile.email && existing.email !== profile.email)) {
      await database("resident")
        .where({ id: existing.id })
        .update({ name: profile.name, email: profile.email || existing.email });
    }
  } else {
    try {
      await database("resident").insert({ auth_user_id: authUserId, ...profile });
    } catch (error) {
      // Two first requests at once: the other one created the row.
      if (error?.code !== "ER_DUP_ENTRY") {
        throw error;
      }
    }
  }

  return toResident(await findByAuthUserId(authUserId));
}

/**
 * Middleware for every resident endpoint: verified token + existing resident row → req.resident.
 * The frontend calls POST /api/me right after sign-in, so a missing row means a broken session.
 */
const requireResident = [
  requireAuth,
  async function loadResident(req, res, next) {
    try {
      const row = await findByAuthUserId(req.auth.userId);
      if (!row) {
        throw new ApiError(401, "resident-missing", "Please sign in again.");
      }
      req.resident = toResident(row);
      return next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json(error.toJSON());
      }
      return next(error);
    }
  }
];

module.exports = { ensureResident, findByAuthUserId, requireResident, toResident, NAME_MAX };
