import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import cookieIcon from "../../assets/cookie.svg";
import homeIcon from "../../assets/home-green.svg";
import { listMyMemberships } from "../../api/households";
import { ErrorState, LoadingState } from "../../components/states";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import { initials } from "../../logic/format";
import RoleChips from "../../components/ui/RoleChips";

/*
 * HK-66 Resident profile view (design HK-65): the signed-in resident's own profile.
 * Name and email come from Google (via Clerk) and are not editable here.
 * Total cookies across all households follows US10.
 */


function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function ProfilePage() {
  const { user, isDemo } = useResident();
  const clerk = useClerk();
  const navigate = useNavigate();
  const { current, select } = useCurrentHousehold();
  const [memberships, setMemberships] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  usePageLoadTracking("ProfilePage", user);

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    let active = true;
    setError(null);
    listMyMemberships(user)
      .then((list) => active && setMemberships(list))
      .catch((loadError) => active && setError(loadError));
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const signOut = useCallback(async () => {
    if (isDemo || !clerk?.signOut) {
      navigate("/sign-in");
      return;
    }
    await clerk.signOut();
    navigate("/sign-in", { replace: true });
  }, [clerk, isDemo, navigate]);

  if (error) {
    return <ErrorState text="We couldn’t load your profile. Check your connection and try again." onRetry={() => setReloadKey((key) => key + 1)} homePath={null} />;
  }

  if (!user || !memberships) {
    return <LoadingState label="Loading your profile…" variant="rows" count={3} />;
  }

  const name = user.fullName || user.firstName || "You";
  const email = user.primaryEmailAddress?.emailAddress;
  const totalCookies = memberships.reduce((sum, item) => sum + (item.cookies || 0), 0);

  return (
    <div className="hk-household hk-profile">
      <div className="hk-page-grid hk-page-grid--side-first">
        <section className="hk-card hk-id-card" aria-labelledby="profile-name">
          <span className="hk-id-card__avatar" aria-hidden="true">
            {user.imageUrl ? <img src={user.imageUrl} alt="" /> : initials(name)}
          </span>
          <h2 id="profile-name">{name}</h2>
          {email && <span className="hk-id-card__email">{email}</span>}
          <span className="hk-id-card__source">
            <GoogleMark />
            Name and email come from your Google account
          </span>
          <span className="hk-cookie-total">
            <img src={cookieIcon} alt="" />
            {totalCookies} {totalCookies === 1 ? "cookie" : "cookies"} in total
          </span>
          <div className="hk-id-card__actions">
            <button type="button" className="hk-btn hk-btn--secondary" onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>

        <section className="hk-card" aria-labelledby="households-heading">
          <h3 className="hk-card__title" id="households-heading">
            Your households ({memberships.length})
          </h3>
          {memberships.map((membership) => {
            const isCurrent = membership.id === current?.id;
            return (
              <div key={membership.id} className="hk-row hk-row--roomy">
                <span className="hk-avatar hk-hh-row__icon" aria-hidden="true">
                  <img src={homeIcon} alt="" />
                </span>
                <div>
                  <span className="hk-hh-row__name">{membership.name}</span>
                  <span className="hk-hh-row__roles">
                    <RoleChips roles={membership.roles} />
                  </span>
                </div>
                <span className="hk-cookies hk-row__end" aria-label={`${membership.cookies} cookies`}>
                  <img src={cookieIcon} alt="" />
                  {membership.cookies}
                </span>
                <span className="hk-hh-row__action">
                  {isCurrent ? (
                    <span className="hk-hh-row__here">Open now</span>
                  ) : (
                    <button
                      type="button"
                      className="hk-link-btn"
                      aria-label={`Open ${membership.name}`}
                      onClick={() => {
                        select(membership.id);
                        navigate("/home");
                      }}
                    >
                      Open
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          <Link to="/household/new" className="hk-add-link">
            + Create or join another household
          </Link>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
