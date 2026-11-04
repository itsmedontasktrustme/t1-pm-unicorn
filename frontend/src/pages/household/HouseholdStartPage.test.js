import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HouseholdStartPage from "./HouseholdStartPage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentHouseholdProvider>
        <Routes>
          <Route path="/household/new" element={<HouseholdStartPage mode="create" />} />
          <Route path="/household/join" element={<HouseholdStartPage mode="join" />} />
          <Route path="/home" element={<p>Household home</p>} />
        </Routes>
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  resetPlaceholderData();
});

test("US1 5a: creating without a name shows the error from the user story", async () => {
  renderAt("/household/new");

  userEvent.click(screen.getByRole("button", { name: /Create household/i }));

  expect(await screen.findByText("Please enter a household name.")).toBeInTheDocument();
  expect(screen.getByLabelText(/Household name/i)).toHaveAttribute("aria-invalid", "true");
});

test("US1: creating a household opens the household home", async () => {
  renderAt("/household/new");

  userEvent.type(screen.getByLabelText(/Household name/i), "Flat Vinohrady");
  userEvent.click(screen.getByRole("button", { name: /Create household/i }));

  expect(await screen.findByText("Household home")).toBeInTheDocument();
});

test("US3: a valid invitation link shows the invitation and can be accepted", async () => {
  renderAt("/household/join?code=HK-7K2M-5P");

  expect(await screen.findByText("Private Drive No. 4")).toBeInTheDocument();
  expect(screen.getByText(/Invited by Vernon D\./i)).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: /Accept invitation/i }));
  expect(await screen.findByText("Household home")).toBeInTheDocument();
});

test("US3 3a: an expired invitation is rejected", async () => {
  renderAt("/household/join?code=HK-4F9Q-2B");

  expect(await screen.findByText(/This invitation is invalid or has expired/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Create my own household/i })).toBeInTheDocument();
});
