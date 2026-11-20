import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { answerInvitee, getHousehold, getInvitationState } from "../../api/households";
import { ErrorState, LoadingState } from "../../components/states";
import { Toast } from "../../components/forms";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import InviteSheet from "./InviteSheet";
import RoleSheet from "./RoleSheet";
import { AVATAR_COLOURS, initials } from "../../logic/format";
import RoleChips from "../../components/ui/RoleChips";

/*
 * People tab (design HK-47 / HK-50):
 * - HK-48 / HK-49 / HK-268 Manage invitations (US2, US3 as updated on 20.11.) — owner: the household's code,
 *   residents who used it (Invitee) with Accept / Reject, Invite resident / New code;
 *   everybody else: "Only the owner can invite residents to this household" (US2 5a).
 * - HK-51 Manage roles (US4) — owner: "Change role" on every housemate (RoleSheet).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

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
        <div key={member.id} className="hk-row">
          <span className="hk-avatar" style={{ background: AVATAR_COLOURS[index % AVATAR_COLOURS.length] }} aria-hidden="true">
            {initials(member.name)}
          </span>
          <div>
            {member.id === userId ? (
              <Link to="/profile" className="hk-member-link" aria-label={`${member.name} (you) — your profile`}>
                <span className="hk-member__name">
                  {member.name} <span className="hk-member__you">(you)</span>
                </span>
              </Link>
            ) : (
              <Link to={`/people/${member.id}`} className="hk-member-link">
                <span className="hk-member__name">{member.name}</span>
              </Link>
            )}
            <span className="hk-member__roles">
              <RoleChips roles={member.roles} />
            </span>
          </div>
          {renderAction && renderAction(member)}
        </div>
      ))}
      {!isOwner && <p className="hk-muted">Only the owner can change roles.</p>}
    </section>
  );
}

function Invitations({ state, busyId, onInvite, onCopy, onAnswer }) {
  const { invitation, invitees } = state;
  return (
    <section className="hk-card" aria-labelledby="invitations-heading">
      <h3 className="hk-card__title" id="invitations-heading">
        Invitations
      </h3>

      {invitees.length > 0 && (
        <>
          <h4 className="hk-group-label">Waiting for your answer ({invitees.length})</h4>
          {invitees.map((invitee) => (
            <div key={invitee.id} className="hk-row hk-invitee">
              <span className="hk-avatar" aria-hidden="true">
                {initials(invitee.name)}
              </span>
              <div>
                <span className="hk-member__name">{invitee.name}</span>
                <span className="hk-inv__meta">Invitee · used the code {new Date(invitee.joinedAt).toLocaleDateString()}</span>
              </div>
              <div className="hk-invitee__actions">
                <button
                  type="button"
                  className="hk-btn hk-btn--secondary"
                  aria-label={`Reject ${invitee.name}`}
                  disabled={busyId === invitee.id}
                  onClick={() => onAnswer(invitee, "reject")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="hk-btn hk-btn--primary"
                  aria-label={`Accept ${invitee.name}`}
                  disabled={busyId === invitee.id}
                  onClick={() => onAnswer(invitee, "accept")}
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
          <h4 className="hk-group-label">Invitation code</h4>
        </>
      )}

      {invitation ? (
        <div className="hk-row">
          <span className="hk-avatar hk-inv__kind" aria-hidden="true">
            #
          </span>
          <div>
            <span className="hk-inv__value">{invitation.code}</span>
            <span className="hk-inv__meta">Code · {expiresLabel(invitation.expiresAt)}</span>
          </div>
          <button
            type="button"
            className="hk-btn hk-btn--secondary"
            aria-label={`Copy code ${invitation.code}`}
            onClick={() => onCopy(invitation.code, "Code")}
          >
            Copy
          </button>
        </div>
      ) : (
        <p className="hk-muted">No valid invitation code.</p>
      )}
      <p className="hk-muted">
        One code per household, valid 1 to 14 days. Residents who use it wait until you accept them.
      </p>
      <div className="hk-card__actions">
        <button type="button" className="hk-btn hk-btn--primary" onClick={onInvite}>
          {invitation ? "New code" : "Invite resident"}
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
          <strong>Only the owner can invite residents to this household</strong>
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
  const [invitationState, setInvitationState] = useState({ invitation: null, invitees: [] });
  const [answeringId, setAnsweringId] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [roleMemberId, setRoleMemberId] = useState(null);
  const currentId = current?.id;

  usePageLoadTracking("PeoplePage", user);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const closeToast = useCallback(() => setToast(null), []);
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const closeRole = useCallback(() => setRoleMemberId(null), []);

  useEffect(() => {
    if (!currentId || !user) {
      return undefined;
    }

    let active = true;
    setError(null);

    (async () => {
      try {
        const data = await getHousehold(user, currentId);
        const me = data.members.find((member) => member.id === data.meId);
        const state = me?.roles.includes("owner")
          ? await getInvitationState(user, currentId)
          : { invitation: null, invitees: [] };
        if (active) {
          setHousehold(data);
          setInvitationState(state);
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

  // US3 steps 6–7 / 6a–6b
  const answer = async (invitee, verb) => {
    setAnsweringId(invitee.id);
    try {
      await answerInvitee(user, currentId, invitee.id, verb);
      setToast(verb === "accept" ? `${invitee.name} is now a housemate` : `${invitee.name} was rejected`);
    } catch (answerError) {
      setToast(answerError.message || "We couldn’t save your answer. Please try again.");
    } finally {
      setAnsweringId(null);
      reload();
    }
  };

  if (error) {
    return <ErrorState text="We couldn’t load the housemates. Check your connection and try again." onRetry={reload} homePath={null} />;
  }

  if (!household || household.id !== currentId) {
    return <LoadingState label="Loading housemates…" variant="rows" count={4} />;
  }

  const me = household.members.find((member) => member.id === household.meId);
  const isOwner = Boolean(me?.roles.includes("owner"));
  const owner = household.members.find((member) => member.roles.includes("owner"));

  return (
    <div className="hk-household hk-people">
      <div className="hk-household__head">
        <h2>People</h2>
      </div>
      <p className="hk-people__lead">Housemates of {household.name} and their roles.</p>

      <div className="hk-page-grid hk-page-grid--balanced">
        <Housemates
          household={household}
          userId={household.meId}
          isOwner={isOwner}
          renderAction={
            isOwner
              ? (member) => (
                  <button
                    type="button"
                    className="hk-link-btn"
                    aria-label={`Change role of ${member.name}`}
                    onClick={() => setRoleMemberId(member.id)}
                  >
                    Change role
                  </button>
                )
              : null
          }
        />
        {isOwner ? (
          <Invitations
            state={invitationState}
            busyId={answeringId}
            onInvite={() => setInviteOpen(true)}
            onCopy={copy}
            onAnswer={answer}
          />
        ) : (
          <OwnerOnlyInvitations ownerName={owner?.name} />
        )}
      </div>

      {isOwner && (
        <InviteSheet
          open={inviteOpen}
          householdId={household.id}
          hasCode={Boolean(invitationState.invitation)}
          onClose={closeInvite}
          onCreated={reload}
          onCopy={copy}
        />
      )}
      {isOwner && (
        <RoleSheet
          open={Boolean(roleMemberId)}
          member={household.members.find((member) => member.id === roleMemberId)}
          isSelf={roleMemberId === household.meId}
          householdId={household.id}
          householdName={household.name}
          onClose={closeRole}
          onChanged={(message) => {
            setRoleMemberId(null);
            setToast(message);
            reload();
          }}
        />
      )}
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}

export default PeoplePage;
