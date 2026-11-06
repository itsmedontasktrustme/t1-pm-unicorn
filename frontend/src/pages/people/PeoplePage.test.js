import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import PeoplePage from "./PeoplePage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

// Several async steps (household list → household → invitations); see HouseholdPage.test.js.
async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

async function renderPeople(householdId) {
  window.localStorage.setItem("homekeeper.currentHouseholdId", householdId);
  render(
    <MemoryRouter>
      <CurrentHouseholdProvider>
        <PeoplePage />
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("US2 5a: a housemate cannot invite and sees who can", async () => {
  await renderPeople("hh-private-drive");

  expect(screen.getByText("Only the owner can invite residents to this household.")).toBeInTheDocument();
  expect(screen.getByText(/Ask Vernon D\./)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Invite resident/i })).not.toBeInTheDocument();
});

test("US2: the owner sees pending invitations and can create a new one", async () => {
  await renderPeople("hh-gryffindor");

  expect(screen.getByText("HK-Q3T8-1X")).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: /Invite resident/i }));
  userEvent.click(screen.getByLabelText(/Code/));
  userEvent.click(screen.getByRole("button", { name: /Create invitation/i }));
  await settle();

  expect(screen.getByRole("heading", { name: "Invitation ready" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  expect(screen.getByText(/Expires on/)).toBeInTheDocument();
});

test("US4 6a/6b: the owner's own role actions are disabled with the reasons", async () => {
  await renderPeople("hh-gryffindor");

  userEvent.click(screen.getByRole("button", { name: "Change role of Harry Potter" }));

  expect(screen.getByRole("button", { name: /Remove manager role/i })).toBeDisabled();
  expect(screen.getByText("The owner must always be a manager.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Give up owner role/i })).toBeDisabled();
  expect(screen.getByText("Hand over the owner role to another housemate first.")).toBeInTheDocument();
});

test("US4: the owner grants the manager role", async () => {
  await renderPeople("hh-gryffindor");

  userEvent.click(screen.getByRole("button", { name: "Change role of Hermione G." }));
  userEvent.click(screen.getByRole("button", { name: /Grant manager role/i }));
  await settle();

  expect(screen.getByText("Hermione G. is now a manager")).toBeInTheDocument();
  expect(screen.getAllByText("Manager")).toHaveLength(3);
});

test("US4: handing over ownership makes the previous owner a housemate", async () => {
  await renderPeople("hh-gryffindor");

  userEvent.click(screen.getByRole("button", { name: "Change role of Ron W." }));
  userEvent.click(screen.getByRole("button", { name: /Hand over owner role/i }));
  expect(screen.getByRole("heading", { name: "Hand over ownership?" })).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "Hand over" }));
  await settle();

  expect(screen.getByText("Ron W. is now the owner")).toBeInTheDocument();
  // The former owner no longer manages invitations or roles.
  expect(screen.getByText("Only the owner can invite residents to this household.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Change role of/ })).not.toBeInTheDocument();
});
