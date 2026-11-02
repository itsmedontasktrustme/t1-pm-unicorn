import { useCallback, useEffect, useState } from "react";
import { getHousehold, listInvitations } from "../../api/households";
import { ErrorState, LoadingState } from "../../components/states";
import { Toast } from "../../components/forms";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import InviteSheet from "./InviteSheet";

/*
 * People tab (design HK-47 / HK-50):
 * - HK-48 Manage invitations (US2) — owner: pending invitations + Invite resident;
 *   everybody else: "Only the owner can invite residents to this household" (US2 5a).
 * - HK-51 Manage roles (US4) — see the Change role actions.
 */

const ROLE_LABELS = { owner: "Owner", manager: "Manager", housemate: "Housemate" };
const AVATAR_COLOURS = ["var(--hk-orange)", "var(--hk-lime)", "var(--hk-peach)", "#e9dcc8"];
const DAY_MS = 24 * 60 * 60 * 1000;

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function expiresLabel(iso) {
  const days = Math.max(0, Math.ceil((new Date(iso) - new Date()) / DAY_MS));
  const when = days <= 1 ? "expires today" : `expires in ${days} days`;
  return `${when} (${new Date(iso).toLocaleDateString()})`;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Housemates({ household, userId, isOwner, renderAction }) {
  return (
    <section className="hk-card" aria-labelledby="housemates-heading">
      <h3 className="hk-card__title" id="housemates-heading">
        Housemates ({household.members.length})
      </h3>
      {household.members.map((member, index) => (
        <div key={member.id} className="hk-member-row">
          <span className="hk-avatar" style={{ background: AVATAR_COLOURS[index % AVATAR_COLOURS.length] }} aria-hidden="true">
            {initials(member.name)}
          </span>
          <div>
            <span className="hk-member__name">
              {member.name} {member.id === userId && <span className="hk-member__you">(you)</span>}
            </span>
            <span className="hk-member__roles">
              {member.roles.map((role) => (
                <span key={role} className={`hk-chip hk-chip--${role}`}>
                  {ROLE_LABELS[role] || role}
                </span>
              ))}
            </span>
          </div>
          {renderAction && renderAction(member)}
        </div>
      ))}
      {!isOwner && <p className="hk-muted">Only the owner can change roles.</p>}
    </section>
  );
}

function Invitations({ invitations, onInvite, onCopy }) {
  return (
    <section className="hk-card" aria-labelledby="invitations-heading">
      <h3 className="hk-card__title" id="invitations-heading">
        Invitations
      </h3>
      {invitations.length === 0 && <p className="hk-muted">No pending invitations.</p>}
      {invitations.map((invitation) => {
        const value = invitation.kind === "link" ? invitation.link : invitation.code;
        return (
          <div key={invitation.code} className="hk-inv">
            <span className="hk-inv__kind" aria-hidden="true">
              {invitation.kind === "link" ? "↗" : "#"}
            </span>
            <div className="hk-inv__main">
              <span className="hk-inv__value">{value}</span>
              <span className="hk-inv__meta">
                {invitation.kind === "link" ? "Link" : "Code"} · {expiresLabel(invitation.expiresAt)}
              </span>
            </div>
            <button
              type="button"
              className="hk-btn hk-btn--secondary"
              aria-label={`Copy ${invitation.kind} ${invitation.code}`}
              onClick={() => onCopy(value, invitation.kind === "link" ? "Link" : "Code")}
            >
              Copy
            </button>
          </div>
        );
      })}
      <p className="hk-muted">Invitations are valid for 7 days. Anyone with the link or code can join as a housemate.</p>
      <div className="hk-card__actions">
        <button type="button" className="hk-btn hk-btn--primary" onClick={onInvite}>
          Invite resident
        </button>
      </div>
    </section>
  );
}

function OwnerOnlyInvitations({ ownerName }) {
  return (
    <section className="hk-card" aria-labelledby="invitations-heading">
      <h3 className="hk-card__title" id="invitations-heading">
        Invitations
      </h3>
      <div className="hk-lonely" style={{ paddingTop: 0 }}>
        <span className="hk-state__icon" style={{ width: 64, height: 64 }}>
          <LockIcon />
        </span>
        <p>
          <strong>Only the owner can invite residents to this household.</strong>
        </p>
        {ownerName && <p>Ask {ownerName} to send an invitation to the person you want to add.</p>}
      </div>
    </section>
  );
}

function PeoplePage() {
  const { user } = useResident();
  const { current } = useCurrentHousehold();
  const [household, setHousehold] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const currentId = current?.id;

  usePageLoadTracking("PeoplePage", user);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const closeToast = useCallback(() => setToast(null), []);
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  useEffect(() => {
    if (!currentId || !user) {
      return undefined;
    }

    let active = true;
    setError(null);

    (async () => {
      try {
        const data = await getHousehold(user, currentId);
        const me = data.members.find((member) => member.id === user.id);
        const pending = me?.roles.includes("owner") ? await listInvitations(user, currentId) : [];
        if (active) {
          setHousehold(data);
          setInvitations(pending);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentId, user, reloadKey]);

  const copy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} copied`);
    } catch (copyError) {
      setToast("Couldn’t copy — select it and copy manually");
    }
  }, []);

  if (error) {
    return <ErrorState text="We couldn’t load the housemates. Check your connection and try again." onRetry={reload} homePath={null} />;
  }

  if (!household || household.id !== currentId) {
    return <LoadingState label="Loading housemates…" variant="rows" count={4} />;
  }

  const me = household.members.find((member) => member.id === user?.id);
  const isOwner = Boolean(me?.roles.includes("owner"));
  const owner = household.members.find((member) => member.roles.includes("owner"));

  return (
    <div className="hk-household hk-people">
      <div className="hk-household__head">
        <h2>People</h2>
      </div>
      <p className="hk-people__lead">Housemates of {household.name} and their roles.</p>

      <div className="hk-people__grid">
        <Housemates household={household} userId={user?.id} isOwner={isOwner} />
        {isOwner ? (
          <Invitations invitations={invitations} onInvite={() => setInviteOpen(true)} onCopy={copy} />
        ) : (
          <OwnerOnlyInvitations ownerName={owner?.name} />
        )}
      </div>

      {isOwner && (
        <InviteSheet open={inviteOpen} householdId={household.id} onClose={closeInvite} onCreated={reload} onCopy={copy} />
      )}
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}

export default PeoplePage;
