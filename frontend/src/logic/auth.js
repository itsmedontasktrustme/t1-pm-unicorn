/*
 * Clerk session token for calls to our backend ("Authorization: Bearer <token>").
 *
 * Clerk session tokens live only ~60 seconds, so they must not be stored: Clerk keeps
 * its own in-memory cache and refreshes the token before it expires. Ask it every time.
 */

// Tokens used to be kept in sessionStorage under this key; a stale one would now be rejected.
const LEGACY_TOKEN_SESSION_KEY = "homekeeper.clerk.token";

try {
  window.sessionStorage?.removeItem(LEGACY_TOKEN_SESSION_KEY);
} catch (error) {
  // Storage blocked — nothing to clean up.
}

async function getClerkToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const session = window.Clerk?.session;
  if (!session || typeof session.getToken !== "function") {
    return null;
  }

  try {
    return (await session.getToken()) || null;
  } catch (error) {
    return null;
  }
}

/** Headers with the bearer token of the signed-in resident (none when signed out). */
async function authHeaders(extra = {}) {
  const token = await getClerkToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

export { getClerkToken, authHeaders };
