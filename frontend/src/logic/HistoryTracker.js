/*
Placeholder for history management, for now it logs the current user actions.
*/

import { formatTimestamp } from "./TimeTools";

const recentActionKeys = new Map();
const ACTION_DEDUP_TTL_MS = 2500;

function getActionKey(component, user, action) {
  const userId = user?.id || user?.userId || "unknown";
  return `${component}|${userId}|${action}`;
}

function logTrackedAction(message) {
  console.log(message);
}

async function sendTrackedActionToBackend(component, user, action) {
  const backendUrl = process.env.REACT_APP_HISTORY_API_URL || "/api/history/action";

  try {
    await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component,
        action,
        user: user || null
      })
    });
  } catch (error) {
    console.error("Unable to log history action to backend", error);
  }
}

function trackAction(component, user, action) {
  const now = Date.now();
  const actionKey = getActionKey(component, user, action);
  const lastSeen = recentActionKeys.get(actionKey);

  if (lastSeen && now - lastSeen < ACTION_DEDUP_TTL_MS) {
    return;
  }

  recentActionKeys.set(actionKey, now);

  const username = user?.fullName || user?.firstName || user?.name || "unauthenticated";
  const userId = user?.id || user?.userId || "unknown";
  const timestamp = formatTimestamp();
  const message = `[${timestamp}] User: ${username}, ID: ${userId}, performed action: ${action} on Component: ${component}`;

  logTrackedAction(message);
  sendTrackedActionToBackend(component, user, action);
}

export { trackAction };