import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

const mockClerk = { isLoaded: true, isSignedIn: false };

jest.mock("@clerk/react", () => ({
  HandleSSOCallback: () => null,
  useUser: () => ({ isLoaded: mockClerk.isLoaded, isSignedIn: mockClerk.isSignedIn, user: null }),
  useAuth: () => ({ getToken: () => Promise.resolve(null) }),
  useSignIn: () => ({ signIn: null })
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

jest.mock("./logic/HistoryTracker", () => ({ trackAction: () => {} }));

async function settle(rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

beforeEach(() => {
  window.localStorage.clear();
  mockClerk.isLoaded = true;
  mockClerk.isSignedIn = false;
});

test("guest opening an app page is sent to the sign-in screen", () => {
  renderAt("/tasks");

  expect(screen.getByRole("heading", { name: /Sign in to HomeKeeper/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
});

test("sign-in screen shows the cancelled notice (US0 4a)", () => {
  renderAt("/sign-in?status=cancelled");

  expect(screen.getByText(/Sign-in with Google was cancelled/i)).toBeInTheDocument();
});

test("signed-in resident sees the app shell", () => {
  mockClerk.isSignedIn = true;
  renderAt("/tasks");

  expect(screen.getByText(/HomeKeeper/i)).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /Main navigation/i })).toBeInTheDocument();
});

test("HK-264: header shows own cookies in the current household and links to own profile", async () => {
  mockClerk.isSignedIn = true;
  window.localStorage.setItem("homekeeper.currentHouseholdId", "hh-private-drive");
  renderAt("/tasks");
  await settle();

  const cookies = screen.getByRole("link", { name: /Your cookies in Private Drive No\. 4: 64/ });
  expect(cookies).toHaveAttribute("href", "/history?view=mine");
  expect(screen.getByRole("link", { name: "Your profile" })).toHaveAttribute("href", "/profile");
});
