import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ErrorBoundary from "./ErrorBoundary";
import NotFoundPage from "../pages/NotFoundPage";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null })
}));

jest.mock("../logic/HistoryTracker", () => ({ trackAction: () => {} }));

function Broken() {
  throw new Error("TypeError: cannot read properties of undefined (reading 'name')");
}

test("HK-93: a crash shows the shared error state without technical details", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>
  );
  spy.mockRestore();

  expect(screen.getByRole("alert")).toHaveTextContent("Oops, something went wrong");
  expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/home");
  expect(screen.queryByText(/cannot read properties/)).not.toBeInTheDocument();
});

test("HK-93: an unknown address shows the not-found state with a way home", () => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );

  expect(screen.getByRole("heading", { name: "Huh? We can’t find this page" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/home");
});
