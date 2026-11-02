import { useUser } from "@clerk/react";

/*
 * The signed-in resident.
 * In development without a Clerk key (REACT_APP_CLERK_PUBLISHABLE_KEY not set) Clerk never
 * loads, so screens would wait forever. There we return a fixed demo resident instead,
 * to be able to build and click through the screens locally. Never used in production.
 */

const DEMO_RESIDENT = {
  id: "dev-demo-resident",
  firstName: "Harry",
  fullName: "Harry Potter",
  primaryEmailAddress: { emailAddress: "harry.potter@gmail.com" },
  imageUrl: null
};

const USE_DEMO_RESIDENT =
  process.env.NODE_ENV !== "production" &&
  !process.env.REACT_APP_CLERK_PUBLISHABLE_KEY &&
  !process.env.VITE_CLERK_PUBLISHABLE_KEY &&
  !process.env.CLERK_PUBLISHABLE_KEY;

function useResident() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (USE_DEMO_RESIDENT) {
    return { isLoaded: true, isSignedIn: true, user: DEMO_RESIDENT, isDemo: true };
  }

  return { isLoaded, isSignedIn, user, isDemo: false };
}

export default useResident;
