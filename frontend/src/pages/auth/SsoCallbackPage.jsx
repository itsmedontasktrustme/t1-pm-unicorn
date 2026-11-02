import { HandleSSOCallback } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import GuestLayout from "../../components/auth/GuestLayout";
import { LoadingState } from "../../components/states";

/*
 * Return point from Google (redirectCallbackUrl of signIn.sso()).
 * Clerk finishes the sign-in or sign-up here and tells us where to go.
 */

function goTo(navigate, url) {
  if (url.startsWith("http")) {
    window.location.href = url;
    return;
  }
  navigate(url, { replace: true });
}

function SsoCallbackPage() {
  const navigate = useNavigate();

  return (
    <GuestLayout>
      <section className="hk-auth-card">
        <LoadingState label="Signing you in…" count={0} />
        <HandleSSOCallback
          navigateToApp={({ decorateUrl }) => goTo(navigate, decorateUrl("/home"))}
          // Sign-in could not finish (e.g. cancelled at Google, US0 4a).
          navigateToSignIn={() => goTo(navigate, "/sign-in?status=cancelled")}
          // Sign-up needs more data than Google provides — not expected with Google-only sign-in.
          navigateToSignUp={() => goTo(navigate, "/sign-in?status=cancelled")}
        />
      </section>
    </GuestLayout>
  );
}

export default SsoCallbackPage;
