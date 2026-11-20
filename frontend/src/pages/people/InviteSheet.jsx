import { useState } from "react";
import Sheet from "../../components/Sheet";
import { FormBanner, FormField } from "../../components/forms";
import { createInvitation, INVITATION_DAYS, validateValidDays } from "../../api/households";
import useResident from "../../logic/useResident";

/*
 * HK-48 / HK-49 / HK-268: create an invitation code (US2 as updated on 20.11.).
 * One code per household, valid 1–14 days (7 by default); a new code replaces the previous one.
 */

function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

function InviteSheet({ open, householdId, hasCode, onClose, onCreated, onCopy }) {
  const { user } = useResident();
  const [days, setDays] = useState(String(INVITATION_DAYS.default));
  const [daysError, setDaysError] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setCreated(null);
    setError(null);
    setDaysError(null);
    setDays(String(INVITATION_DAYS.default));
    setBusy(false);
    onClose();
  };

  const create = async () => {
    // US2 6a
    const validityError = validateValidDays(days);
    setDaysError(validityError);
    if (validityError) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const invitation = await createInvitation(user, householdId, Number(days));
      setCreated(invitation);
      onCreated();
    } catch (createError) {
      if (createError.fields?.validDays) {
        setDaysError(createError.fields.validDays);
      } else {
        // US2 5a — only reachable if the role changed meanwhile.
        setError(createError.code === "not-owner" ? createError.message : "We couldn’t create the invitation. Please try again.");
      }
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
            <button type="button" className="hk-btn hk-btn--primary" onClick={() => onCopy(created.code, "Code")}>
              Copy code
            </button>
          </div>
          <span className="hk-share__expiry">
            Expires on {formatDate(created.expiresAt)}. Send the code to the people you want to invite — you’ll accept or reject
            them in People.
          </span>
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
      <FormField
        id="invite-days"
        label="Valid for (days)"
        required
        hint={`From ${INVITATION_DAYS.min} to ${INVITATION_DAYS.max} days.`}
        error={daysError}
      >
        <input
          type="number"
          inputMode="numeric"
          min={INVITATION_DAYS.min}
          max={INVITATION_DAYS.max}
          step={1}
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </FormField>
      <p className="hk-share__expiry">
        {hasCode ? "The household’s current code will stop working. " : ""}
        Anyone with the code can ask to join; you decide who becomes a housemate.
      </p>
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
