function getAuthorizationToken(req) {
  const authorizationHeader = req.headers.authorization || req.headers.Authorization;

  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1].trim() : null;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  const encodedPayload = parts[1];
  const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (error) {
    console.error("Failed to decode JWT payload", error);
    return null;
  }
}

function getAuthenticatedUserId(req) {
  const token = getAuthorizationToken(req);

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (payload) {
    const inferredUserId = [
      payload.sub,
      payload.userId,
      payload.user_id,
      payload.clerkUserId,
      payload.id,
      payload.user?.id,
      payload.user?.userId
    ].find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");

    if (inferredUserId) {
      return String(inferredUserId);
    }
  }

  return String(token);
}

function normalizeUserId(user) {
  const rawUserId = user?.id ?? user?.userId ?? null;

  if (rawUserId === null || rawUserId === undefined) {
    return null;
  }

  return String(rawUserId);
}

function assertAuthenticatedUserMatches(req, userId) {
  const authenticatedUserId = getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return {
      status: 401,
      error: "Authentication required"
    };
  }

  if (!userId) {
    return {
      status: 400,
      error: "user id is required"
    };
  }

  if (String(userId) !== String(authenticatedUserId)) {
    return {
      status: 403,
      error: "Forbidden: history records can only be accessed by the authenticated user"
    };
  }

  return null;
}

module.exports = {
  getAuthorizationToken,
  decodeJwtPayload,
  getAuthenticatedUserId,
  normalizeUserId,
  assertAuthenticatedUserMatches
};
