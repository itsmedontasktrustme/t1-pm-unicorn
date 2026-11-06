import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import HistoryPage from "./HistoryPage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { createHousehold, resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

async function settle(rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

async function renderHistory(householdId) {
  window.localStorage.setItem("homekeeper.currentHouseholdId", householdId);
  render(
    <MemoryRouter>
      <CurrentHouseholdProvider>
        <HistoryPage />
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("US10: household view shows completed tasks with who marked them done and cookie totals", async () => {
  await renderHistory("hh-private-drive");

  expect(screen.getByText("Cookies by housemate")).toBeInTheDocument();
  expect(screen.getByText("Clean the kitchen")).toBeInTheDocument();
  expect(screen.getByText(/Petunia D\. · marked done by Vernon D\./)).toBeInTheDocument();
  expect(screen.getByText(/Harry Potter · marked done by you/)).toBeInTheDocument();
  expect(screen.getByLabelText("120 cookies")).toBeInTheDocument();
});

test("US10 3a: a household without completed tasks says so", async () => {
  const household = await createHousehold({ id: "dev-demo-resident", fullName: "Harry Potter" }, "Flat Vinohrady");
  await renderHistory(household.id);

  expect(screen.getByText("There are no completed tasks in this household yet")).toBeInTheDocument();
});

test("US10 2a-2b: Mine shows own cookies across households and own completed tasks", async () => {
  await renderHistory("hh-private-drive");

  userEvent.click(screen.getByRole("button", { name: "Mine" }));
  await settle();

  expect(screen.getByText("104")).toBeInTheDocument();
  expect(screen.getByText("64 · Private Drive No. 4")).toBeInTheDocument();
  expect(screen.getByText("40 · Gryffindor Tower")).toBeInTheDocument();
  expect(screen.getByText("Mow the lawn")).toBeInTheDocument();
  expect(screen.getByText("Sweep the common room")).toBeInTheDocument();
  expect(screen.getByText("marked done by Ron W.")).toBeInTheDocument();
});
