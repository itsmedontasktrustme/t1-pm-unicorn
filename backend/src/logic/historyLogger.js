const { formatTimestamp } = require("./time");

function writeHistoryLog({ component, user, action }) {
  const username = user?.fullName || user?.firstName || user?.name || "unauthenticated";
  const userId = user?.id || user?.userId || "null";
  const timestamp = formatTimestamp();
  const message = `[${timestamp}] User: ${username}, ID: ${userId}, performed action: ${action} on Component: ${component}`;

  console.log(message);

  return message;
}

module.exports = { writeHistoryLog };
