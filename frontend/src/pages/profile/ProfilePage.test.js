import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProfilePage from "./ProfilePage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null }),
  useClerk: () => ({})
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

async function settle(rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("shows Google identity, total cookies (US10) and every household with roles", async () => {
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <CurrentHouseholdProvider>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/home" element={<p>Household home</p>} />
        </Routes>
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();

  expect(screen.getByRole("heading", { name: "Harry Potter" })).toBeInTheDocument();
  expect(screen.getByText("harry.potter@gmail.com")).toBeInTheDocument();
  expect(screen.getByText(/104 cookies in total/)).toBeInTheDocument();
  expect(screen.getByText("Your households (2)")).toBeInTheDocument();
  expect(screen.getByText("Open now")).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: "Open Gryffindor Tower" }));
  expect(screen.getByText("Household home")).toBeInTheDocument();
  expect(window.localStorage.getItem("homekeeper.currentHouseholdId")).toBe("hh-gryffindor");
});
