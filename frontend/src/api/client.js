/*
 * HTTP client for our backend (/api/*, proxied by setupProxy.js in development and nginx in production).
 *
 * - Every request carries the Clerk session token ("Authorization: Bearer <token>").
 * - Error answers ({ ok: false, code, error }) become ApiError(code, message, status);
 *   `message` is the text from the user stories and can be shown as it is.
 * - The resident row is created by POST /api/me before the first request of a signed-in user
 *   (HK-55 / HK-58), so the screens do not have to care about the first sign-in.
 *
 * Without a Clerk key (local demo) and in unit tests the screens use the placeholder API
 * in the browser (USE_PLACEHOLDER_API), so they can still be clicked through and tested.
 */
import { getClerkToken } from "../logic/auth";

export const USE_PLACEHOLDER_API =
  process.env.NODE_ENV === "test" ||
  process.env.REACT_APP_API === "placeholder" ||
  !process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(code, message, status = null, fields = null) {
    super(message);
    this.code = code;
    this.status = status;
    // Texts per form field from the backend, e.g. { name: "Please enter a household name (max 20 characters)" }.
    this.fields = fields;
  }
}

/** Fired when the backend no longer accepts the session (401); App.jsx shows "Your session has expired". */
export const SESSION_EXPIRED_EVENT = "homekeeper:session-expired";

const NETWORK_MESSAGE = "We couldn’t reach Homekeeper. Check your connection and try again.";
const SERVER_MESSAGE = "Something went wrong on our side. Please try again.";

async function send(method, path, body) {
  const token = await getClerkToken();
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new ApiError("network", NETWORK_MESSAGE);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    const status = response.status;
    if (status === 401) {
      console.error("[Frontend API] 401 Unauthorized response", {
        path,
        method,
        payload,
        hasToken: Boolean(token)
      });
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (status >= 500 || !payload) {
      throw new ApiError("server", SERVER_MESSAGE, status);
    }
    throw new ApiError(payload.code || "error", payload.error || SERVER_MESSAGE, status, payload.fields || null);
  }

  return payload;
}

// One POST /api/me per signed-in user and page load.
let meRequest = null;
let meUserId = null;

/** HK-55 / HK-58: the resident of the signed-in Clerk user, created on the first sign-in. */
export function ensureMe(user) {
  if (!meRequest || meUserId !== user?.id) {
    meUserId = user?.id || null;
    meRequest = send("POST", "/me", {
      name: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null,
      email: user?.primaryEmailAddress?.emailAddress || null
    })
      .then((payload) => payload.resident)
      .catch((error) => {
        meRequest = null;
        throw error;
      });
  }
  return meRequest;
}

/**
 * Request as the signed-in resident: makes sure the resident exists, then calls the endpoint.
 * Returns the JSON answer without the `ok` flag.
 */
export async function request(user, method, path, body) {
  await ensureMe(user);
  const { ok, ...data } = await send(method, path, body);
  return data;
}

/** For tests: forget the cached resident. */
export function resetClient() {
  meRequest = null;
  meUserId = null;
}
