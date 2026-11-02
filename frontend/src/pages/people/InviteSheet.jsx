import { useState } from "react";
import Sheet from "../../components/Sheet";
import { FormBanner } from "../../components/forms";
import { createInvitation } from "../../api/households";
import useResident from "../../logic/useResident";

/* HK-48: create an invitation (US2 steps 2–7) — choose Link or Code, then copy it. */

function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

function InviteSheet({ open, householdId, onClose, onCreated, onCopy }) {
  const { user } = useResident();
  const [kind, setKind] = useState("link");
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setCreated(null);
    setError(null);
    setBusy(false);
    onClose();
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const invitation = await createInvitation(user, householdId, kind);
      setCreated(invitation);
      onCreated();
    } catch (createError) {
      // US2 5a — only reachable if the role changed meanwhile.
      setError(createError.code === "not-owner" ? createError.message : "We couldn’t create the invitation. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Sheet open={open} onClose={close} labelledBy="invite-ready-title">
        <h2 id="invite-ready-title">Invitation ready</h2>
        <div className="hk-share">
          <div className="hk-share__box">
            <span className="hk-share__value">{created.code}</span>
            <button type="button" className={created.kind === "code" ? "hk-btn hk-btn--primary" : "hk-btn hk-btn--secondary"} onClick={() => onCopy(created.code, "Code")}>
              Copy code
            </button>
          </div>
          <div className="hk-share__box">
            <span className="hk-share__value hk-share__value--small">{created.link}</span>
            <button type="button" className={created.kind === "link" ? "hk-btn hk-btn--primary" : "hk-btn hk-btn--secondary"} onClick={() => onCopy(created.link, "Link")}>
              Copy link
            </button>
          </div>
          <span className="hk-share__expiry">Expires on {formatDate(created.expiresAt)} · shows in your pending invitations</span>
        </div>
        <div className="hk-sheet__actions">
          <button type="button" className="hk-btn hk-btn--secondary" onClick={close}>
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} labelledBy="invite-title">
      <h2 id="invite-title">Invite a resident</h2>
      {error && <FormBanner title={error} />}
      <fieldset className="hk-choice-pair">
        <legend>How do you want to share the invitation?</legend>
        <label>
          <input type="radio" name="invite-kind" value="link" checked={kind === "link"} onChange={() => setKind("link")} />
          <strong>Link</strong>
          <span>Send it in a chat — one tap to join.</span>
        </label>
        <label>
          <input type="radio" name="invite-kind" value="code" checked={kind === "code"} onChange={() => setKind("code")} />
          <strong>Code</strong>
          <span>Easy to read out or type in.</span>
        </label>
      </fieldset>
      <p className="hk-share__expiry">Valid for 7 days. They’ll join as a housemate.</p>
      <div className="hk-sheet__actions hk-sheet__actions--two">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={close} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="hk-btn hk-btn--primary" onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Create invitation"}
        </button>
      </div>
    </Sheet>
  );
}

export default InviteSheet;
