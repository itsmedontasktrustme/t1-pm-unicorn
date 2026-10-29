import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

jest.mock("@clerk/react", () => ({
  SignInButton: ({ children }) => <button type="button">{children || "Sign in"}</button>,
  UserButton: () => <button type="button">Google user</button>,
  useUser: () => ({ isLoaded: true, isSignedIn: false })
}));

test("renders the HomeKeeper task detail screen", () => {
  const { getByText, getByDisplayValue, getByRole, getAllByRole } = render(
    <MemoryRouter initialEntries={["/tasks"]}>
      <App />
    </MemoryRouter>
  );

  expect(getByText(/HomeKeeper/i)).toBeInTheDocument();
  expect(getByRole("heading", { name: /TASK DETAIL/i })).toBeInTheDocument();
  expect(getByDisplayValue(/Make roast for dinner/i)).toBeInTheDocument();
  expect(getAllByRole("button", { name: /Mark as done/i }).length).toBeGreaterThan(0);
});
