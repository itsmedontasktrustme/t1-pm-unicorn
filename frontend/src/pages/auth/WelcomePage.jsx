import { Link, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/react";
import homeIcon from "../../assets/home-green.svg";
import membersIcon from "../../assets/members-green.svg";
import GuestLayout from "../../components/auth/GuestLayout";
import { LoadingState } from "../../components/states";
import { initials } from "../../logic/format";

/*
 * HK-57 Register view (design HK-56, US0 steps 8–9).
 * Shown after Google sign-in. A brand-new account gets "Your account is ready";
 * a returning resident gets "Welcome back". Both can create or join a household.
 *
 * TODO(HK-58): when the backend tells us the resident's households, send residents
 * who already belong to a household straight to /home instead of this screen.
 */

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

// Development-only preview without Clerk: /welcome?preview=new|back
const PREVIEW_USER = {
  firstName: "Harry",
  fullName: "Harry Potter",
  primaryEmailAddress: { emailAddress: "harry.potter@gmail.com" },
  imageUrl: null
};

function isNewAccount(user) {
  const created = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
  return Date.now() - created < NEW_ACCOUNT_WINDOW_MS;
}

function Choice({ to, icon, title, text }) {
  return (
    <Link className="hk-choice" to={to}>
      <span className="hk-choice__icon">
        <img src={icon} alt="" />
      </span>
      <span>
        <span className="hk-choice__title">{title}</span>
        <span className="hk-choice__text">{text}</span>
      </span>
      <span className="hk-choice__arrow" aria-hidden="true">›</span>
    </Link>
  );
}

function WelcomePage() {
  const { isLoaded, user } = useUser();
  const [searchParams] = useSearchParams();
  const preview = process.env.NODE_ENV !== "production" ? searchParams.get("preview") : null;

  const resident = preview ? PREVIEW_USER : user;
  const isNew = preview ? preview === "new" : isNewAccount(user);

  if (!preview && (!isLoaded || !user)) {
    return (
      <GuestLayout>
        <section className="hk-auth-card">
          <LoadingState label="Getting things ready…" count={0} />
        </section>
      </GuestLayout>
    );
  }

  const name = resident.fullName || resident.firstName || "there";
  const email = resident.primaryEmailAddress?.emailAddress;

  return (
    <GuestLayout>
      <section className="hk-auth-card" aria-labelledby="welcome-title">
        <p className="hk-auth-card__hello">
          {isNew ? `Hi ${resident.firstName || name}, welcome home!` : `Welcome back, ${resident.firstName || name}!`}
        </p>
        <h1 className="hk-auth-card__title" id="welcome-title">
          {isNew ? "Your account is ready" : "Where to next?"}
        </h1>

        <div className="hk-profile-card">
          <span className="hk-profile-card__avatar" aria-hidden="true">
            {resident.imageUrl ? <img src={resident.imageUrl} alt="" /> : initials(name)}
          </span>
          <div>
            <div className="hk-profile-card__name">{name}</div>
            {email && <div className="hk-profile-card__email">{email}</div>}
          </div>
          <span className="hk-profile-card__via">via Google</span>
        </div>

        <p className="hk-auth-card__text">
          {isNew ? "You’re not in a household yet. What would you like to do?" : "Pick up where you left off, or start something new."}
        </p>

        <div className="hk-choices">
          {!isNew && <Choice to="/home" icon={homeIcon} title="Go to my household" text="Open your tasks and cookies." />}
          <Choice to="/household/new" icon={homeIcon} title="Create a household" text="You’ll be the owner and can invite others." />
          <Choice to="/household/join" icon={membersIcon} title="Join with an invitation" text="Got a link or code from a housemate? Use it here." />
        </div>
      </section>
    </GuestLayout>
  );
}

export default WelcomePage;
