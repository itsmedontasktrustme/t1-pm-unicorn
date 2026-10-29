import React from "react";
import { render } from "@testing-library/react";

jest.mock("@clerk/react", () => ({
  SignInButton: ({ children }) => <button type="button">{children || "Sign in"}</button>,
  UserButton: () => <button type="button">Google user</button>,
  useUser: () => ({ isLoaded: true, isSignedIn: false })
}));

import App from "./App";

test("renders the HomeKeeper task detail screen", () => {
  const { getByText, getByDisplayValue, getByRole } = render(<App />);

  expect(getByText(/HomeKeeper/i)).toBeInTheDocument();
  expect(getByRole("heading", { name: /TASK DETAIL/i })).toBeInTheDocument();
  expect(getByDisplayValue(/Make roast for dinner/i)).toBeInTheDocument();
  expect(getByRole("button", { name: /Mark as done/i })).toBeInTheDocument();
});
