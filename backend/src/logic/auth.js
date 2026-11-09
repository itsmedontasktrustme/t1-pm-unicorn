/*
 * Authentication and authorization.
 *
 * Residents sign in with Google through Clerk (frontend: pages/auth/SignInPage.jsx).
 * Every API call carries the Clerk session token: "Authorization: Bearer <JWT>".
 * Here the token signature, expiry and authorized party are verified, so the user id
 * cannot be forged by the client (the old code only base64-decoded the payload).
 */

const { verifyToken } = require("@clerk/backend");
const { auth: authConfig } = require("../config");

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getAuthorizationToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1].trim() : null;
}

function isAuthConfigured(config = authConfig) {
  return Boolean(config.jwtKey || config.secretKey);
}

/**
 * Verifies a Clerk session token and returns { userId, sessionId, claims }.
 * Throws AuthError(401) when the token is missing, malformed, expired or not signed by Clerk.
 */
async function verifySessionToken(token, config = authConfig) {
  if (!token) {
    throw new AuthError(401, "unauthorized", "Authentication required");
  }

  if (!isAuthConfigured(config)) {
    // Fail closed: without a key nothing can be verified.
    throw new AuthError(401, "unauthorized", "Authentication is not configured on the server");
  }

  let claims;
  try {
    claims = await verifyToken(token, {
      ...(config.jwtKey ? { jwtKey: config.jwtKey } : { secretKey: config.secretKey }),
      ...(config.authorizedParties.length > 0 ? { authorizedParties: config.authorizedParties } : {})
    });
  } catch (error) {
    throw new AuthError(401, "unauthorized", `Invalid session token${error?.reason ? ` (${error.reason})` : ""}`);
  }

  if (!claims?.sub) {
    throw new AuthError(401, "unauthorized", "Session token has no user");
  }

  return {
    userId: String(claims.sub),
    sessionId: claims.sid ? String(claims.sid) : null,
    claims
  };
}

/** Verifies the request's token once and caches the result on req.auth. */
async function authenticateRequest(req) {
  if (!req.auth) {
    req.auth = await verifySessionToken(getAuthorizationToken(req));
  }
  return req.auth;
}

function sendAuthError(res, error) {
  return res.status(error.status).json({
    ok: false,
    code: error.code,
    error: error.message
  });
}

/** Express middleware: only signed-in residents get through; sets req.auth. */
async function requireAuth(req, res, next) {
  try {
    await authenticateRequest(req);
    return next();
  } catch (error) {
    if (error instanceof AuthError) {
      return sendAuthError(res, error);
    }
    return next(error);
  }
}

/**
 * Express middleware (after requireAuth): the resident may only access their own data,
 * identified by the route parameter `paramName`.
 */
function requireSelf(paramName = "userId") {
  return function requireSelfMiddleware(req, res, next) {
    const requestedUserId = req.params[paramName];

    if (!requestedUserId) {
      return sendAuthError(res, new AuthError(400, "validationError", `${paramName} is required`));
    }

    if (String(requestedUserId) !== req.auth.userId) {
      return sendAuthError(res, new AuthError(403, "forbidden", "Forbidden: you can only access your own records"));
    }

    return next();
  };
}

function normalizeUserId(user) {
  const rawUserId = user?.id ?? user?.userId ?? null;

  if (rawUserId === null || rawUserId === undefined) {
    return null;
  }

  return String(rawUserId);
}

module.exports = {
  AuthError,
  getAuthorizationToken,
  isAuthConfigured,
  verifySessionToken,
  authenticateRequest,
  requireAuth,
  requireSelf,
  normalizeUserId
};
