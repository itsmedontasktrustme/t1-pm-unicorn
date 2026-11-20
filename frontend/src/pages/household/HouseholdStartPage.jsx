import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import homeIcon from "../../assets/home-green.svg";
import membersIcon from "../../assets/members-green.svg";
import GuestLayout from "../../components/auth/GuestLayout";
import { FormBanner, FormField } from "../../components/forms";
import {
  createHousehold,
  getInvitation,
  joinWithCode,
  HOUSEHOLD_DESCRIPTION_MAX,
  HOUSEHOLD_NAME_MAX,
  validateHousehold
} from "../../api/households";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import useResident from "../../logic/useResident";
import { initials } from "../../logic/format";

/*
 * HK-63 Create / join household view (design HK-62, US1 + US3).
 * /household/new          — create (US1)
 * /household/join[?code=] — join with an invitation code (US3): the resident becomes an Invitee
 *                           and sees “Pending invitation” until the owner accepts them
 */

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB");
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
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFailed(false);

    // US1 5a / 5b
    const fieldErrors = validateHousehold(name, description);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setBusy(true);
    try {
      const household = await createHousehold(user, name, description);
      onDone(household, "created");
    } catch (createError) {
      if (createError.fields) {
        setErrors(createError.fields);
      } else {
        console.error("Unable to create household", createError);
        setFailed(true);
      }
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
          error={errors.name}
        >
          <input type="text" value={name} maxLength={HOUSEHOLD_NAME_MAX} onChange={(event) => setName(event.target.value)} placeholder="e.g. Flat Vinohrady" />
        </FormField>
        <FormField
          id="household-description"
          label="Description"
          hint={`Optional, up to ${HOUSEHOLD_DESCRIPTION_MAX} characters.`}
          error={errors.description}
        >
          <textarea
            rows={3}
            value={description}
            maxLength={HOUSEHOLD_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Third floor, the door with the blue mat"
          />
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

function JoinFlow({ initialCode }) {
  const { user } = useResident();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode || "");
  const [invitation, setInvitation] = useState(null);
  const [pending, setPending] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [already, setAlready] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const lookUp = async (value) => {
    setInvalid(false);
    setAlready(false);
    setFailed(false);
    if (!value.trim()) {
      setInvalid(true);
      return;
    }

    setBusy(true);
    try {
      setInvitation(await getInvitation(user, value));
    } catch (lookupError) {
      if (lookupError.code === "invitation-invalid") {
        setInvalid(true); // US3 2a
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
    // Only when opened with ?code= in the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const join = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setPending(await joinWithCode(user, invitation.code));
    } catch (joinError) {
      if (joinError.code === "invitation-invalid") {
        setInvitation(null);
        setInvalid(true);
      } else if (joinError.code === "already-housemate") {
        setInvitation(null);
        setAlready(true); // US3 3a
      } else {
        console.error("Unable to join household", joinError);
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (pending) {
    // US3 step 4: the resident is an Invitee until the owner accepts them.
    return (
      <>
        <h1 className="hk-auth-card__title">Pending invitation</h1>
        <div className="hk-invite">
          <div className="hk-invite__icon">
            <img src={homeIcon} alt="" />
          </div>
          <p className="hk-invite__name">{pending.householdName}</p>
          <span className="hk-badge">Waiting for the owner</span>
          <div className="hk-invite__meta">
            {invitation?.invitedBy ? `${invitation.invitedBy} (owner)` : "The owner"} will accept or reject you. You’ll see the
            household and its tasks as soon as you’re accepted.
          </div>
        </div>
        <div className="hk-actions">
          <button type="button" className="hk-btn hk-btn--primary" onClick={() => navigate("/welcome")}>
            OK
          </button>
        </div>
      </>
    );
  }

  if (invitation) {
    return (
      <>
        <h1 className="hk-auth-card__title">You’re invited!</h1>
        {failed && <FormBanner title="We couldn’t join the household">Please try again in a moment.</FormBanner>}
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
            {invitation.memberCount} {invitation.memberCount === 1 ? "housemate" : "housemates"} · code valid until{" "}
            {formatDate(invitation.expiresAt)}
          </div>
          <span className="hk-badge">The owner accepts you before you join</span>
        </div>
        <div className="hk-actions">
          <button type="button" className="hk-btn hk-btn--primary" onClick={join} disabled={busy}>
            {busy ? "Joining…" : "Join household"}
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
      <p className="hk-auth-card__text">Enter the invitation code you got from the owner.</p>
      {invalid && code.trim() && (
        <FormBanner title="This invitation is invalid or has expired">Ask the owner for a new one.</FormBanner>
      )}
      {already && (
        <FormBanner title="You are already a housemate of this household">
          <Link to="/home">Go to my household</Link>
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
          <JoinFlow key={searchParams.get("code") || "manual"} initialCode={searchParams.get("code")} />
        ) : (
          <CreateForm onDone={handleDone} />
        )}
      </section>
    </GuestLayout>
  );
}

export default HouseholdStartPage;
