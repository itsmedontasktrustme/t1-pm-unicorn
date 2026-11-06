import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HousemateProfilePage from "./HousemateProfilePage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { resetPlaceholderData } from "../../api/households";

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

async function renderProfile(householdId, memberId) {
  window.localStorage.setItem("homekeeper.currentHouseholdId", householdId);
  render(
    <MemoryRouter initialEntries={[`/people/${memberId}`]}>
      <CurrentHouseholdProvider>
        <Routes>
          <Route path="/people/:memberId" element={<HousemateProfilePage />} />
          <Route path="/profile" element={<p>Own profile</p>} />
        </Routes>
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("shows a housemate's roles, cookies, current and completed tasks", async () => {
  await renderProfile("hh-private-drive", "demo-petunia");

  expect(screen.getByRole("heading", { name: "Petunia D." })).toBeInTheDocument();
  expect(screen.getByText("95 cookies")).toBeInTheDocument();
  expect(screen.getByText("Make roast for dinner")).toBeInTheDocument();
  expect(screen.getByText("Water the plants")).toBeInTheDocument();
  // The viewer is a housemate here — no role management.
  expect(screen.queryByRole("button", { name: "Change role" })).not.toBeInTheDocument();
});

test("a new housemate shows empty states and the owner can change the role", async () => {
  await renderProfile("hh-gryffindor", "demo-hermione");

  expect(screen.getByText("Nothing assigned yet")).toBeInTheDocument();
  expect(screen.getByText("Hermione can pick up an available task on the Task board.")).toBeInTheDocument();
  expect(screen.getByText(/No completed tasks yet/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Change role" })).toBeInTheDocument();
});

test("opening your own id goes to your profile", async () => {
  await renderProfile("hh-private-drive", "dev-demo-resident");

  expect(screen.getByText("Own profile")).toBeInTheDocument();
});
