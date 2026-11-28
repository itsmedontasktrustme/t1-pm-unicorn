import { useEffect, useState } from "react";
import { useClerk } from "../../logic/clerk";
import { useNavigate } from "react-router-dom";
import GuestLayout from "../auth/GuestLayout";
import { StatePanel } from "../states";
import { SESSION_EXPIRED_EVENT } from "../../api/client";

/*
 * HK-94: the backend answered 401 (the Clerk session is no longer valid, or the resident row
 * is missing). Instead of a broken screen the resident sees one calm state and signs in again.
 */

export function useSessionExpired() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => setExpired(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return expired;
}

function SessionExpired() {
  const clerk = useClerk();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const signInAgain = async () => {
    setBusy(true);
    try {
      await clerk?.signOut?.();
    } finally {
      navigate("/sign-in", { replace: true });
      window.location.reload();
    }
  };

  return (
    <GuestLayout>
      <section className="hk-auth-card">
        <StatePanel
          role="alert"
          icon="!"
          title="Your session has expired"
          text="For your security you were signed out. Please sign in again to continue."
          actions={
            <button type="button" className="hk-btn hk-btn--primary" onClick={signInAgain} disabled={busy}>
              {busy ? "Signing out…" : "Sign in again"}
            </button>
          }
        />
      </section>
    </GuestLayout>
  );
}

export default SessionExpired;
