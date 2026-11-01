/*
Placeholder for history management, for now it logs the current user actions.
*/

import { formatTimestamp } from "./TimeTools";

function emitTrackedAction(message) {
  const output = `${message}\n`;

  console.log(message);

  if (typeof process !== "undefined" && process.stdout && typeof process.stdout.write === "function") {
    process.stdout.write(output);
  }
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
  const username = user?.fullName || user?.firstName || user?.name || "unauthenticated";
  const userId = user?.id || user?.userId || "unknown";
  const timestamp = formatTimestamp();
  const message = `[${timestamp}] User: ${username}, ID: ${userId}, performed action: ${action} on Component: ${component}`;

  emitTrackedAction(message);
  sendTrackedActionToBackend(component, user, action);
}

export { trackAction };