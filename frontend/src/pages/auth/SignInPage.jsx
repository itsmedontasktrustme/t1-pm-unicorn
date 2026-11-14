import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useSignIn, useUser } from "@clerk/react";
import wordmark from "../../assets/wordmark.svg";
import GuestLayout, { TAGLINE } from "../../components/auth/GuestLayout";
import GoogleButton from "../../components/auth/GoogleButton";
import { FormBanner } from "../../components/forms";

/*
 * HK-54 Sign-in view (design HK-53, US0).
 * Sign-in and registration are one flow: the resident account is created
 * on the first Google sign-in. Clerk handles OAuth; we render our own button.
 *
 * ?status=cancelled     — Google sign-in was cancelled (US0 4a)
 * ?status=email-exists  — email already used by another resident (US0 6a)
 */

const SSO_CALLBACK_PATH = "/sso-callback";
const AFTER_SIGN_IN_PATH = "/welcome";

function StatusBanner({ status, email, failed }) {
  if (failed) {
    return (
      <FormBanner title="We couldn’t open Google sign-in">
        Please try again in a moment. If it keeps happening, let us know.
      </FormBanner>
    );
  }

  if (status === "cancelled") {
    return (
      <FormBanner tone="info" title="Sign-in with Google was cancelled">
        No account was created. You can try again whenever you’re ready.
      </FormBanner>
    );
  }

  if (status === "email-exists") {
    return (
      <FormBanner title="A resident with this email already exists">
        {email ? `${email} is already linked to another HomeKeeper account. ` : ""}
        Sign in with that account, or choose a different Google account.
      </FormBanner>
    );
  }

  return null;
}

function SignInPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { signIn } = useSignIn();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const status = searchParams.get("status");
  const email = searchParams.get("email");
  const hasNotice = Boolean(status) || failed;

  if (isLoaded && isSignedIn) {
    return <Navigate to="/welcome" replace />;
  }

  const handleGoogle = async () => {
    setFailed(false);

    if (!signIn) {
      setFailed(true);
      return;
    }

    setBusy(true);
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: AFTER_SIGN_IN_PATH,
      redirectCallbackUrl: SSO_CALLBACK_PATH
    });

    // On success the browser is redirected to Google, so we only get here on error.
    if (error) {
      console.error("Google sign-in could not start", error);
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <GuestLayout>
      <section className="hk-auth-card" aria-labelledby="sign-in-title">
        <img className="hk-auth-card__wordmark" src={wordmark} alt="HomeKeeper" />
        {!hasNotice && <p className="hk-auth-card__hello">Welcome home!</p>}
        <h1 className="hk-auth-card__title" id="sign-in-title">
          Sign in to HomeKeeper
        </h1>
        {hasNotice ? <StatusBanner status={status} email={email} failed={failed} /> : <p className="hk-auth-card__text">{TAGLINE}</p>}
        <GoogleButton onClick={handleGoogle} busy={busy}>
          {status === "email-exists" ? "Use a different Google account" : "Continue with Google"}
        </GoogleButton>
        <p className="hk-hint">
          {status === "cancelled"
            ? "HomeKeeper needs your Google name and email to create your account."
            : "New here? The same button creates your account — we only use your Google name and email."}
        </p>
      </section>
    </GuestLayout>
  );
}

export default SignInPage;
