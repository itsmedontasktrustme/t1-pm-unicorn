/*
 * Sign-in / sign-out log.
 *
 * Each event is written to stdout (container log) and stored in two tables:
 *   auth_log — the security log with session id, IP address and user agent,
 *              at most one row per (session, event) so repeated calls are harmless;
 *   history  — the resident's activity log shown on the History tab (component "Auth").
 */

const database = require("../database");
const { formatTimestamp } = require("./time");

const AUTH_EVENTS = Object.freeze({
  SIGN_IN: "sign-in",
  SIGN_OUT: "sign-out"
});

const AUTH_COMPONENT = "Auth";
const MAX_USER_AGENT_LENGTH = 512;

function formatAuthLogMessage({ event, userId, userName, sessionId, ipAddress }) {
  return `[${formatTimestamp()}] User: ${userName || "unknown"}, ID: ${userId}, performed action: ${event} on Component: ${AUTH_COMPONENT} (session: ${sessionId}, ip: ${ipAddress || "unknown"})`;
}

/**
 * Stores the event. Returns { recorded: true } for a new event and { recorded: false }
 * when the same event of the same session was already logged.
 */
async function saveAuthEvent({ event, userId, sessionId, ipAddress, userAgent }) {
  return database.transaction(async (trx) => {
    const [insertedId] = await trx("auth_log")
      .insert({
        user_id: userId,
        session_id: sessionId,
        event,
        ip_address: ipAddress || null,
        user_agent: userAgent ? String(userAgent).slice(0, MAX_USER_AGENT_LENGTH) : null
      })
      .onConflict(["session_id", "event"])
      .ignore();

    // INSERT IGNORE of a duplicate row reports id 0.
    if (!insertedId) {
      return { recorded: false };
    }

    await trx("history").insert({
      component: AUTH_COMPONENT,
      user_id: userId,
      action: event
    });

    return { recorded: true };
  });
}

/** Logs the event to stdout and the database. Never throws: a log failure must not block sign-in/out. */
async function recordAuthEvent(details) {
  const message = formatAuthLogMessage(details);

  try {
    const { recorded } = await saveAuthEvent(details);

    if (recorded) {
      console.log(message);
    }

    return { message, recorded, persisted: true };
  } catch (error) {
    // Still keep a trace of the event in the container log.
    console.log(message);
    console.error("Unable to persist auth event to database", error?.message || error);

    return { message, recorded: true, persisted: false };
  }
}

module.exports = {
  AUTH_EVENTS,
  AUTH_COMPONENT,
  formatAuthLogMessage,
  recordAuthEvent
};
