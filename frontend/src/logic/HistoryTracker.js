/*
 * Sends user actions (page loads, clicks) to the activity log on the backend.
 * Only the user's id and name are sent — that is all the backend uses
 * (backend/src/logic/history.js, historyLogger.js), not the whole Clerk profile with
 * e-mail addresses and phone numbers. The console copy is for local development only.
 */

import { formatTimestamp } from "./TimeTools";

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

function actorOf(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id || user.userId || null,
    fullName: user.fullName || user.firstName || user.name || null
  };
}

async function sendTrackedActionToBackend(component, actor, action) {
  const backendUrl = process.env.REACT_APP_HISTORY_API_URL || "/api/history/action";

  try {
    await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ component, action, user: actor })
    });
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error("Unable to log history action to backend", error);
    }
  }
}

function trackAction(component, user, action) {
  const actor = actorOf(user);

  if (IS_DEVELOPMENT) {
    const timestamp = formatTimestamp();
    console.log(
      `[${timestamp}] User: ${actor?.fullName || "unauthenticated"}, ID: ${actor?.id || "unknown"}, performed action: ${action} on Component: ${component}`
    );
  }

  sendTrackedActionToBackend(component, actor, action);
}

export { trackAction };
