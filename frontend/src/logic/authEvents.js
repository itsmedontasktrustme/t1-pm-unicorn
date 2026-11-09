/*
 * Sign-in / sign-out log (backend: POST /api/auth/sign-in | /api/auth/sign-out).
 * The backend takes the resident's id and session from the verified token; the name is
 * only sent for a readable log line. Logging never blocks signing in or out.
 */

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { getClerkToken } from "./auth";

const AUTH_API_URL = "/api/auth";
const REQUEST_TIMEOUT_MS = 3000;
// Session id whose sign-in was already logged, so a reload does not log it again.
const LOGGED_SESSION_KEY = "homekeeper.auth.loggedSignInSession";

function readLoggedSession() {
  try {
    return window.localStorage.getItem(LOGGED_SESSION_KEY);
  } catch (error) {
    return null;
  }
}

function writeLoggedSession(sessionId) {
  try {
    if (sessionId) {
      window.localStorage.setItem(LOGGED_SESSION_KEY, sessionId);
    } else {
      window.localStorage.removeItem(LOGGED_SESSION_KEY);
    }
  } catch (error) {
    // Storage blocked: the backend ignores repeated events of one session anyway.
  }
}

async function postAuthEvent(event, user, token) {
  if (!token) {
    return false;
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const response = await fetch(`${AUTH_API_URL}/${event}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user: { fullName: user?.fullName || user?.firstName || null } }),
      signal: controller?.signal
    });
    return response.ok;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Unable to log ${event}`, error);
    }
    return false;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/** Logs the sign-out; call it before clerk.signOut() while the token is still valid. */
async function logSignOut(user) {
  const token = await getClerkToken();
  writeLoggedSession(null);
  return postAuthEvent("sign-out", user, token);
}

/** Logs the sign-in once per Clerk session (after the Google sign-in finishes). */
function useSignInLogging() {
  const { isSignedIn, sessionId, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !sessionId || typeof getToken !== "function" || readLoggedSession() === sessionId) {
      return undefined;
    }

    let active = true;
    Promise.resolve(getToken())
      .then((token) => postAuthEvent("sign-in", user, token))
      .then((ok) => {
        if (ok && active) {
          writeLoggedSession(sessionId);
        }
      });

    return () => {
      active = false;
    };
    // The user object changes on every profile reload; the session id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, sessionId, getToken]);
}

export { logSignOut, useSignInLogging };
