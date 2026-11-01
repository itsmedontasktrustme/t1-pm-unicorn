/*
Placeholder for history management, for now it logs the current user actions.
*/

import { formatTimestamp } from "./TimeTools";

function trackAction(component, user, action) {
  const username = user?.fullName || user?.firstName || "unauthenticated";
  const userId = user?.id || "unknown";
  const timestamp = formatTimestamp();

  console.log(`[${timestamp}] User: ${username}, ID: ${userId}, performed action: ${action} on Component: ${component}`);
}

export { trackAction };