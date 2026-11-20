import AccessDeniedState from "./AccessDeniedState";
import ErrorState from "./ErrorState";

/*
 * HK-94 / HK-97: the right state for an error answer of the backend (api/client.js → ApiError).
 *   403 forbidden          → calm "no access" with the text from the backend (user-story wording)
 *   404 not found          → "not found" with the backend text; `onNotFound` offers a way out
 *   401 session            → handled for the whole app (SessionExpired in App.jsx); here a short note
 *   5xx server             → "something went wrong on our side", Try again
 *   network / anything else → the page's own text (usually "check your connection"), Try again
 * The placeholder API (demo, tests) throws the same ApiError codes.
 */

const SERVER_TEXT = "Something went wrong on our side. Please try again in a moment.";

export function errorKind(error) {
  const status = error?.status;
  if (status === 401 || error?.code === "unauthorized" || error?.code === "resident-missing") return "session";
  if (status === 403 || error?.code === "forbidden" || error?.code?.startsWith?.("not-")) {
    return error?.code === "not-found" ? "not-found" : "forbidden";
  }
  if (status === 404 || error?.code === "not-found") return "not-found";
  if (error?.code === "server" || status >= 500) return "server";
  return "network";
}

function ApiErrorState({ error, text, onRetry, homePath = null, notFoundTitle, notFoundText, onNotFound }) {
  const kind = errorKind(error);

  if (kind === "forbidden") {
    return (
      <AccessDeniedState
        title={error.message || "You don’t have access here"}
        text="Ask the owner of this household if you think this is a mistake."
      />
    );
  }

  if (kind === "not-found") {
    return (
      <ErrorState
        title={notFoundTitle || "We couldn’t find this"}
        text={notFoundText || error.message}
        onRetry={onNotFound || null}
        homePath={onNotFound ? null : "/home"}
      />
    );
  }

  if (kind === "session") {
    return <ErrorState title="Your session has expired" text="Please sign in again." homePath={null} />;
  }

  if (kind === "server") {
    return <ErrorState text={SERVER_TEXT} onRetry={onRetry} homePath={homePath} code={error.status || null} />;
  }

  return <ErrorState text={text || error?.message} onRetry={onRetry} homePath={homePath} />;
}

export default ApiErrorState;
