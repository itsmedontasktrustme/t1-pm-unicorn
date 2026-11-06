import { useState } from "react";
import Sheet from "../../components/Sheet";
import { FormBanner } from "../../components/forms";
import { changeRole } from "../../api/households";
import useResident from "../../logic/useResident";

/*
 * HK-51 Manage roles (design HK-50, US4).
 * Only allowed actions are offered. For the owner's own entry both actions are shown
 * disabled with the user-story texts, so errors 6a / 6b cannot happen.
 */

const ROLE_LABELS = { owner: "Owner", manager: "Manager", housemate: "Housemate" };

const SUCCESS = {
  "grant-manager": (name) => `${name} is now a manager`,
  "remove-manager": (name) => `${name} is no longer a manager`,
  "hand-over-owner": (name) => `${name} is now the owner`
};

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Option({ icon, title, description, onClick, disabled = false }) {
  return (
    <button type="button" className="hk-option" onClick={onClick} disabled={disabled}>
      <span className="hk-option__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <span className="hk-option__desc">{description}</span>
    </button>
  );
}

function RoleSheet({ open, member, isSelf, householdId, householdName, onClose, onChanged }) {
  const { user } = useResident();
  const [step, setStep] = useState("options");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!member) {
    return null;
  }

  const name = member.name;
  const isManager = member.roles.includes("manager");

  const close = () => {
    setStep("options");
    setError(null);
    setBusy(false);
    onClose();
  };

  const apply = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await changeRole(user, householdId, member.id, action);
      setStep("options");
      setBusy(false);
      onChanged(SUCCESS[action](name));
    } catch (changeError) {
      setError(changeError.message || "We couldn’t change the role. Please try again.");
      setBusy(false);
    }
  };

  if (step === "confirm") {
    return (
      <Sheet open={open} onClose={close} labelledBy="handover-title" role="alertdialog">
        <h2 id="handover-title">Hand over ownership?</h2>
        {error && <FormBanner title={error} />}
        <p>
          <strong>{name}</strong> will become the owner and a manager of {householdName}.
        </p>
        <div className="hk-warn">
          <span aria-hidden="true">⚠</span>
          <span>
            You’ll stay in the household as a <strong>housemate</strong> and won’t be able to invite people or change roles anymore.
            Only the new owner can undo this.
          </span>
        </div>
        <div className="hk-sheet__actions hk-sheet__actions--two">
          <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setStep("options")} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="hk-btn hk-btn--primary" onClick={() => apply("hand-over-owner")} disabled={busy}>
            {busy ? "Handing over…" : "Hand over"}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} labelledBy="role-title">
      <div className="hk-sheet__who">
        <span className="hk-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <div>
          <strong id="role-title">
            {name}
            {isSelf ? " (you)" : ""}
          </strong>
          <span className="hk-member__roles">
            {member.roles.map((role) => (
              <span key={role} className={`hk-chip hk-chip--${role}`}>
                {ROLE_LABELS[role] || role}
              </span>
            ))}
          </span>
        </div>
      </div>
      {error && <FormBanner title={error} />}

      <div className="hk-options">
        {isSelf ? (
          <>
            {/* US4 6a / 6b — explained up front instead of failing afterwards */}
            <Option icon="−" title="Remove manager role" description="The owner must always be a manager." disabled />
            <Option icon="★" title="Give up owner role" description="Hand over the owner role to another housemate first." disabled />
          </>
        ) : (
          <>
            {isManager ? (
              <Option
                icon="−"
                title="Remove manager role"
                description={`${name} can still pick up and complete tasks.`}
                onClick={() => apply("remove-manager")}
                disabled={busy}
              />
            ) : (
              <Option
                icon="+"
                title="Grant manager role"
                description={`${name} will be able to create and assign tasks.`}
                onClick={() => apply("grant-manager")}
                disabled={busy}
              />
            )}
            <Option
              icon="★"
              title="Hand over owner role"
              description={`${name} becomes the owner. You stay as a housemate.`}
              onClick={() => setStep("confirm")}
              disabled={busy}
            />
          </>
        )}
      </div>

      <div className="hk-sheet__actions">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={close} disabled={busy}>
          {isSelf ? "Close" : "Cancel"}
        </button>
      </div>
    </Sheet>
  );
}

export default RoleSheet;
