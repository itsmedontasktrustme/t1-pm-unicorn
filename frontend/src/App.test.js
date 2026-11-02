import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

const mockClerk = { isLoaded: true, isSignedIn: false };

jest.mock("@clerk/react", () => ({
  UserButton: () => <button type="button">Google user</button>,
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

beforeEach(() => {
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
