import { Link } from "react-router-dom";
import StatePanel from "./StatePanel";

/**
 * Shown when data could not be loaded.
 * `onRetry` adds a "Try again" button, `homePath` adds a "Go to Home" link.
 */
function ErrorState({
  title = "Oops, something went wrong",
  text = "We couldn’t load this page. Check your connection and try again.",
  onRetry,
  homePath = "/home",
  code
}) {
  const actions = (
    <>
      {onRetry && (
        <button type="button" className="hk-btn hk-btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
      {homePath && (
        <Link to={homePath} className="hk-btn hk-btn--secondary">
          Go to Home
        </Link>
      )}
    </>
  );

  return (
    <StatePanel
      tone="danger"
      role="alert"
      icon="!"
      title={title}
      text={text}
      actions={actions}
      note={code ? `Error ${code} · if it keeps happening, tell the household owner.` : null}
    />
  );
}

export default ErrorState;
