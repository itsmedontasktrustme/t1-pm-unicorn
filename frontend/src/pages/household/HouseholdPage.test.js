import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HouseholdPage from "./HouseholdPage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { createHousehold, resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

// The page loads in two steps (household list, then the household itself) and
// React runs the second request's effect only after each act() finishes —
// so give it a few short rounds.
async function settle(rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentHouseholdProvider>
        <Routes>
          <Route path="/home" element={<HouseholdPage />} />
          <Route path="/welcome" element={<p>Welcome screen</p>} />
        </Routes>
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  resetPlaceholderData();
  window.localStorage.clear();
});

test("shows the household with housemates, roles and due tasks", async () => {
  renderAt("/home");
  await settle();

  expect(screen.getByText("Housemates (4)")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Private Drive No. 4" })).toBeInTheDocument();
  expect(screen.getByText("Make roast for dinner")).toBeInTheDocument();
  // A housemate does not get owner actions.
  expect(screen.queryByRole("link", { name: /Invite housemates/i })).not.toBeInTheDocument();
});

test("a freshly created household greets the owner and offers invitations", async () => {
  const household = await createHousehold({ id: "dev-demo-resident", fullName: "Harry Potter" }, "Flat Vinohrady");
  window.localStorage.setItem("homekeeper.currentHouseholdId", household.id);

  renderAt("/home?created=1");
  await settle();

  expect(screen.getByText("Flat Vinohrady is ready!")).toBeInTheDocument();
  expect(screen.getByText("It’s just you for now")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Invite housemates/i })).toBeInTheDocument();
});
