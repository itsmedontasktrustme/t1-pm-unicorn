const CLERK_TOKEN_SESSION_KEY = "homekeeper.clerk.token";
let cachedTokenPromise = null;

async function getClerkToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const existingSessionToken = window.sessionStorage?.getItem(CLERK_TOKEN_SESSION_KEY);
  if (existingSessionToken) {
    return existingSessionToken;
  }

  if (cachedTokenPromise) {
    return cachedTokenPromise;
  }

  const clerk = window.Clerk;
  const tokenProvider =
    (typeof clerk?.getToken === "function" && clerk.getToken) ||
    (clerk?.session && typeof clerk.session.getToken === "function" && clerk.session.getToken);

  if (!tokenProvider) {
    return null;
  }

  cachedTokenPromise = Promise.resolve(tokenProvider())
    .then((token) => {
      if (!token) {
        return null;
      }

      window.sessionStorage?.setItem(CLERK_TOKEN_SESSION_KEY, token);
      return token;
    })
    .finally(() => {
      cachedTokenPromise = null;
    });

  return cachedTokenPromise;
}

export { getClerkToken };
