import { Link } from "react-router-dom";
import StatePanel from "./StatePanel";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Shown when the user is signed in but their role does not allow this page.
 * Calm brand style on purpose — it is not the user's mistake.
 */
function AccessDeniedState({
  title = "You don’t have access here",
  text,
  role,
  backPath = "/home",
  backLabel = "Back to Home",
  contactHint
}) {
  return (
    <StatePanel
      role="alert"
      icon={<LockIcon />}
      title={title}
      text={text}
      badge={role ? `You are: ${role}` : null}
      actions={
        <Link to={backPath} className="hk-btn hk-btn--primary">
          {backLabel}
        </Link>
      }
      note={contactHint}
    />
  );
}

export default AccessDeniedState;
