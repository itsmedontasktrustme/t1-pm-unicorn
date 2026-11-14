import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import homeIcon from "../../assets/home-green.svg";
import membersIcon from "../../assets/members-green.svg";
import GuestLayout from "../../components/auth/GuestLayout";
import { FormBanner, FormField } from "../../components/forms";
import { acceptInvitation, createHousehold, getInvitation } from "../../api/households";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import useResident from "../../logic/useResident";
import { initials } from "../../logic/format";

/*
 * HK-63 Create / join household view (design HK-62, US1 + US3).
 * /household/new          — create (US1)
 * /household/join[?code=] — join with an invitation code or link (US3)
 */

function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

function Tabs({ mode }) {
  return (
    <nav className="hk-segmented" aria-label="Create or join a household">
      <Link className="hk-segmented__item" to="/household/new" aria-current={mode === "create" ? "page" : undefined}>
        Create
      </Link>
      <Link className="hk-segmented__item" to="/household/join" aria-current={mode === "join" ? "page" : undefined}>
        Join
      </Link>
    </nav>
  );
}

function CreateForm({ onDone }) {
  const { user } = useResident();
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFailed(false);

    if (!name.trim()) {
      setError("Please enter a household name."); // US1 5a
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const household = await createHousehold(user, name);
      onDone(household, "created");
    } catch (createError) {
      console.error("Unable to create household", createError);
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="hk-auth-card__title">Create a household</h1>
      <p className="hk-auth-card__text">Give your home a name your housemates will recognise.</p>
      {failed && <FormBanner title="We couldn’t create the household">Please try again in a moment.</FormBanner>}
      <form className="hk-form" noValidate onSubmit={handleSubmit}>
        <FormField
          id="household-name"
          label="Household name"
          required
          hint="For example “Flat Vinohrady” or “The Dursleys”."
          error={error}
        >
          <input type="text" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="e.g. Flat Vinohrady" />
        </FormField>
        <div className="hk-note">
          <img src={membersIcon} alt="" />
          <span>
            You’ll be the <strong>owner</strong> and a <strong>manager</strong>. Next you can invite the people you live with.
          </span>
        </div>
        <div className="hk-actions">
          <button type="submit" className="hk-btn hk-btn--primary" disabled={busy}>
            {busy ? "Creating…" : "Create household"}
          </button>
        </div>
      </form>
    </>
  );
}

function JoinFlow({ initialCode, onDone }) {
  const { user } = useResident();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode || "");
  const [invitation, setInvitation] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const lookUp = async (value) => {
    setInvalid(false);
    setFailed(false);
    if (!value.trim()) {
      setInvalid(true);
      return;
    }

    setBusy(true);
    try {
      setInvitation(await getInvitation(value));
    } catch (lookupError) {
      if (lookupError.code === "invitation-invalid") {
        setInvalid(true); // US3 3a
      } else {
        console.error("Unable to check invitation", lookupError);
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      lookUp(initialCode);
    }
    // Only when opened from an invitation link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const accept = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const household = await acceptInvitation(user, invitation.code);
      onDone(household, "joined");
    } catch (acceptError) {
      if (acceptError.code === "invitation-invalid") {
        setInvitation(null);
        setInvalid(true);
      } else {
        console.error("Unable to accept invitation", acceptError);
        setFailed(true);
      }
      setBusy(false);
    }
  };

  if (invitation) {
    return (
      <>
        <h1 className="hk-auth-card__title">You’re invited!</h1>
        {failed && <FormBanner title="We couldn’t accept the invitation">Please try again in a moment.</FormBanner>}
        <div className="hk-invite">
          <div className="hk-invite__icon">
            <img src={homeIcon} alt="" />
          </div>
          <p className="hk-invite__name">{invitation.householdName}</p>
          <div className="hk-invite__from">
            <span className="hk-avatar hk-avatar--small" style={{ background: "var(--hk-orange)" }} aria-hidden="true">
              {initials(invitation.invitedBy)}
            </span>
            Invited by {invitation.invitedBy} (owner)
          </div>
          <div className="hk-invite__meta">
            {invitation.memberCount} {invitation.memberCount === 1 ? "housemate" : "housemates"} · invitation valid until{" "}
            {formatDate(invitation.expiresAt)}
          </div>
          <span className="hk-badge">You’ll join as a Housemate</span>
        </div>
        <div className="hk-actions">
          <button type="button" className="hk-btn hk-btn--primary" onClick={accept} disabled={busy}>
            {busy ? "Joining…" : "Accept invitation"}
          </button>
          <button type="button" className="hk-btn hk-btn--secondary" onClick={() => navigate("/welcome")} disabled={busy}>
            Not now
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="hk-auth-card__title">Join a household</h1>
      <p className="hk-auth-card__text">Open the invitation link you received, or enter the code here.</p>
      {invalid && (
        <FormBanner title="This invitation is invalid or has expired">
          Ask the owner for a new one. Invitations are valid for 7 days.
        </FormBanner>
      )}
      {failed && <FormBanner title="We couldn’t check the code">Please try again in a moment.</FormBanner>}
      <form
        className="hk-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          lookUp(code);
        }}
      >
        <FormField id="invitation-code" label="Invitation code" error={invalid ? (code.trim() ? "No valid invitation with this code." : "Enter the code from your invitation.") : null}>
          <input type="text" value={code} autoCapitalize="characters" onChange={(event) => setCode(event.target.value)} placeholder="e.g. HK-7K2M-5P" />
        </FormField>
        <div className="hk-actions">
          <button type="submit" className="hk-btn hk-btn--primary" disabled={busy}>
            {busy ? "Checking…" : "Check code"}
          </button>
          {invalid && (
            <Link to="/household/new" className="hk-btn hk-btn--secondary">
              Create my own household
            </Link>
          )}
        </div>
      </form>
    </>
  );
}

function HouseholdStartPage({ mode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { select, refresh } = useCurrentHousehold();

  const handleDone = (household, how) => {
    select(household.id);
    refresh();
    navigate(`/home?${how}=1`);
  };

  return (
    <GuestLayout backTo="/welcome">
      <section className="hk-auth-card hk-auth-card--left">
        <Tabs mode={mode} />
        {mode === "join" ? (
          <JoinFlow key={searchParams.get("code") || "manual"} initialCode={searchParams.get("code")} onDone={handleDone} />
        ) : (
          <CreateForm onDone={handleDone} />
        )}
      </section>
    </GuestLayout>
  );
}

export default HouseholdStartPage;
