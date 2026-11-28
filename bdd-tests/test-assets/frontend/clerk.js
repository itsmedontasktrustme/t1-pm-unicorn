import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ClerkProvider as RealClerkProvider,
  HandleSSOCallback as RealHandleSSOCallback,
  useAuth as useRealAuth,
  useClerk as useRealClerk,
  useSignIn as useRealSignIn,
  useUser as useRealUser
} from "@clerk/react";

const USE_OIDC_MOCK = process.env.REACT_APP_E2E_AUTH === "true";
const SESSION_KEY = "homekeeper.e2e.auth";
const MockAuthContext = createContext(null);

function readMockSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function ClerkProvider({ children, ...props }) {
  if (!USE_OIDC_MOCK) {
    return React.createElement(RealClerkProvider, props, children);
  }
  return React.createElement(MockClerkProvider, null, children);
}

function MockClerkProvider({ children }) {
  const [session, setSession] = useState(readMockSession);
  const getToken = useCallback(async () => session?.token || null, [session?.token]);

  if (session) {
    window.Clerk = { session: { ...session, getToken } };
  }

  const signOut = useCallback(async () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.Clerk = undefined;
    setSession(null);
  }, []);

  useEffect(() => {
    window.Clerk = session ? { session: { ...session, getToken } } : undefined;
    return () => {
      window.Clerk = undefined;
    };
  }, [getToken, session]);

  const signIn = useMemo(() => ({
    sso: async ({ redirectUrl }) => {
      try {
        const response = await fetch("/oidc/test/token", { method: "POST" });
        if (!response.ok) throw new Error(`Mock identity provider returned ${response.status}`);
        const next = await response.json();
        if (next.cancelled) {
          window.location.assign("/sign-in?status=cancelled");
          return {};
        }
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        window.Clerk = { session: { ...next, getToken: async () => next.token } };
        setSession(next);
        window.location.assign(redirectUrl || "/welcome");
        return {};
      } catch (error) {
        return { error };
      }
    }
  }), []);

  const value = useMemo(() => ({
    isLoaded: true,
    isSignedIn: Boolean(session),
    user: session?.user || null,
    sessionId: session?.sessionId || null,
    getToken,
    signIn,
    signOut
  }), [getToken, session, signIn, signOut]);

  return React.createElement(MockAuthContext.Provider, { value }, children);
}

function useMockAuth() {
  const value = useContext(MockAuthContext);
  if (!value) throw new Error("Mock ClerkProvider is missing");
  return value;
}

const useUser = USE_OIDC_MOCK ? useMockAuth : useRealUser;
const useAuth = USE_OIDC_MOCK ? useMockAuth : useRealAuth;
const useSignIn = USE_OIDC_MOCK
  ? function useMockSignIn() { return { signIn: useMockAuth().signIn }; }
  : useRealSignIn;
const useClerk = USE_OIDC_MOCK ? useMockAuth : useRealClerk;
const HandleSSOCallback = RealHandleSSOCallback;

export { ClerkProvider, HandleSSOCallback, useAuth, useClerk, useSignIn, useUser };
